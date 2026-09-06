from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import serializers
from django.db.models import Q
from core.jobs.models import Job
from core.resumes.models import Resume
from core.applications.models import Application
from core.applications.services import ensure_application_match
from core.ai_services.parser import extract_resume_text
from core.ai_services.services import analyze_job_application
from .models import Recommendation
from .matching_service import match_resume_to_job, compare_skills, extract_keywords


def _job_text(job):
    reqs = ', '.join(str(r) for r in (job.requirements or []))
    return f"{job.title}\n{job.description}\nRequirements: {reqs}"


def _coerce_score(value):
    try:
        return min(100.0, max(0.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def _candidate_skills(resume):
    """Return the best available candidate skill list.

    Prefers AI-extracted skills; falls back to lightweight local keyword
    extraction from the resume text so matching works even without Gemini.
    """
    if resume.skills:
        return resume.skills or []
    skills = []
    text = ''
    if resume.parsed_raw_text:
        text = resume.parsed_raw_text
    elif resume.file and resume.file.path:
        try:
            text = extract_resume_text(resume.file.path, resume.file_format)
        except Exception:
            text = ''
    if text:
        skills = extract_keywords(text)
    return skills


def _save_recommendation(resume, job, match, source='local'):
    """Persist a match result for a (resume, job) pair.

    Keeps the most recent analysis on the backend so pages can show the
    last analyzed data without re-running the analysis on every load.
    """
    defaults = {
        'match_score': match.get('match_score', 0.0),
        'matched_skills': match.get('matched_skills', []),
        'missing_skills': match.get('missing_skills', []),
        'source': source,
    }
    rec, created = Recommendation.objects.get_or_create(
        resume=resume, job=job, defaults=defaults
    )
    if not created:
        rec.match_score = defaults['match_score']
        rec.matched_skills = defaults['matched_skills']
        rec.missing_skills = defaults['missing_skills']
        rec.source = source
        rec.save(update_fields=['match_score', 'matched_skills', 'missing_skills',
                                'source', 'updated_at'])
    return rec


def _recommendation_payload(rec):
    job = rec.job
    return {
        'job_id': str(job.id),
        'job_title': job.title,
        'job_company': job.company,
        'job_location': job.location,
        'job_type': job.job_type,
        'experience_level': job.experience_level,
        'salary_min': str(job.salary_min) if job.salary_min is not None else None,
        'salary_max': str(job.salary_max) if job.salary_max is not None else None,
        'match_score': rec.match_score,
        'matched_skills': rec.matched_skills,
        'missing_skills': rec.missing_skills,
        'source': rec.source,
        'analyzed_at': rec.updated_at.isoformat(),
    }


class RecommendationSerializer(serializers.Serializer):
    resume_id = serializers.UUIDField(required=False, allow_null=True)
    use_ai = serializers.BooleanField(required=False, default=False)


class GapSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    resume_id = serializers.UUIDField(required=False, allow_null=True)


class MatchingViewSet(viewsets.ViewSet):
    """Endpoints using deterministic application-code matching."""

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='recommendations')
    def recommendations(self, request):
        """Job seeker: recommend jobs matching the candidate's resume.

        Uses the primary resume. Returns jobs with match score, matched and
        missing skills. Applies deterministic skill comparison + scoring.

        Results are persisted on the backend per (resume, job). A normal
        request returns the last saved analysis; only an explicit refresh
        (use_ai=true) re-runs AI analysis and updates the saved data.
        """
        serializer = RecommendationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resume = None
        resume_id = serializer.validated_data.get('resume_id')
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id)
                if not (request.user.is_admin_user or resume.user == request.user):
                    return Response({'error': 'Permission denied.'},
                                    status=status.HTTP_403_FORBIDDEN)
            except Resume.DoesNotExist:
                return Response({'error': 'Resume not found.'}, status=status.HTTP_404_NOT_FOUND)

        if resume is None:
            resume = Resume.objects.filter(user=request.user, is_primary=True).first()

        if not resume:
            return Response(
                {'error': 'No resume found. Upload a resume first.',
                 'code': 'no_resume'},
                status=status.HTTP_400_BAD_REQUEST
            )

        candidate_skills = _candidate_skills(resume)
        resume_text = ''
        if resume.parsed_raw_text:
            resume_text = resume.parsed_raw_text
        elif resume.file and resume.file.path:
            try:
                resume_text = extract_resume_text(resume.file.path, resume.file_format)
            except Exception:
                resume_text = ''

        use_ai = serializer.validated_data.get('use_ai', False)
        open_jobs = Job.objects.filter(is_active=True, status='open')
        existing = {r.job_id: r for r in
                    Recommendation.objects.filter(resume=resume, job__in=open_jobs)}

        results = []
        for job in open_jobs:
            saved = existing.get(job.id)
            match = None
            source = 'local'
            if use_ai and resume_text:
                try:
                    ai = analyze_job_application(
                        _job_text(job), resume_text, candidate_skills)
                    match = {
                        'match_score': _coerce_score(ai.get('match_score')),
                        'matched_skills': ai.get('matched_skills', []),
                        'missing_skills': ai.get('missing_skills', []),
                    }
                    source = 'ai'
                except Exception:
                    match = None
            if match is not None:
                rec = _save_recommendation(resume, job, match, source)
            elif saved is not None:
                # Keep the last saved analysis without re-running or re-stamping.
                rec = saved
            else:
                match = match_resume_to_job(
                    candidate_skills,
                    job_required_skills=job.skills_required,
                    job_requirements_text=job.description,
                )
                rec = _save_recommendation(resume, job, match, 'local')
            results.append(_recommendation_payload(rec))

        # Sort by match score descending
        results.sort(key=lambda x: x['match_score'], reverse=True)
        return Response(results)

    @action(detail=False, methods=['post'], url_path='skill-gap')
    def skill_gap(self, request):
        """Job seeker: compute skills gap for a specific job.

        Returns the last saved analysis for the job, creating and storing a
        deterministic match result if none exists yet.
        """
        serializer = GapSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            job = Job.objects.get(id=serializer.validated_data['job_id'])
        except Job.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

        resume = None
        resume_id = serializer.validated_data.get('resume_id')
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id)
                if not (request.user.is_admin_user or resume.user == request.user):
                    return Response({'error': 'Permission denied.'},
                                    status=status.HTTP_403_FORBIDDEN)
            except Resume.DoesNotExist:
                return Response({'error': 'Resume not found.'}, status=status.HTTP_404_NOT_FOUND)

        if resume is None:
            resume = Resume.objects.filter(user=request.user, is_primary=True).first()

        if not resume:
            return Response({'error': 'No resume found.'}, status=status.HTTP_404_NOT_FOUND)

        candidate_skills = _candidate_skills(resume)

        saved = Recommendation.objects.filter(resume=resume, job=job).first()
        if saved is None:
            match = match_resume_to_job(
                candidate_skills,
                job_required_skills=job.skills_required,
                job_requirements_text=job.description,
            )
            saved = _save_recommendation(resume, job, match, 'local')

        payload = _recommendation_payload(saved)
        payload['candidate_skills'] = candidate_skills
        return Response(payload)

    @action(detail=False, methods=['get'], url_path='applicants')
    def applicants(self, request):
        """Recruiter: list applicants for the recruiter's jobs with AI match data.

        Supports ordering by match_score and filtering by minimum score.
        """
        if not request.user.is_recruiter and not request.user.is_admin_user:
            return Response({'error': 'Recruiters only.'}, status=status.HTTP_403_FORBIDDEN)

        applications = Application.objects.filter(job__recruiter=request.user) \
            if not request.user.is_admin_user else Application.objects.all()

        min_score = request.query_params.get('min_score')
        if min_score:
            try:
                applications = applications.filter(match_score__gte=float(min_score))
            except ValueError:
                pass

        status_filter = request.query_params.get('status')
        if status_filter:
            applications = applications.filter(status=status_filter)

        job_filter = request.query_params.get('job')
        if job_filter:
            applications = applications.filter(job_id=job_filter)

        order = request.query_params.get('ordering', '-match_score')
        if order in ['match_score', '-match_score']:
            applications = applications.order_by(order)
        else:
            applications = applications.order_by('-match_score')

        for application in applications.select_related('resume', 'job'):
            ensure_application_match(application)

        return Response([{
            'application_id': str(a.id),
            'job_id': str(a.job_id),
            'job_title': a.job.title,
            'applicant_id': a.applicant_id,
            'applicant_name': a.applicant.get_full_name() or a.applicant.username,
            'applicant_email': a.applicant.email,
            'status': a.status,
            'match_score': a.match_score,
            'matched_skills': a.matched_skills,
            'missing_skills': a.missing_skills,
            'is_ai_analyzed': a.is_ai_analyzed,
            'match_source': a.match_source,
            'applied_at': a.created_at,
            'cover_letter': a.cover_letter,
            'resume_file': a.resume.file.url if a.resume and a.resume.file else None,
        } for a in applications])
