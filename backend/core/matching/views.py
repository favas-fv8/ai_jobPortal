from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import serializers
from django.db.models import Q
from core.jobs.models import Job
from core.resumes.models import Resume
from core.applications.models import Application
from core.ai_services.parser import extract_resume_text
from core.ai_services.services import analyze_job_application
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

        results = []
        for job in open_jobs:
            match = None
            if use_ai and resume_text:
                try:
                    ai = analyze_job_application(
                        _job_text(job), resume_text, candidate_skills)
                    match = {
                        'match_score': _coerce_score(ai.get('match_score')),
                        'matched_skills': ai.get('matched_skills', []),
                        'missing_skills': ai.get('missing_skills', []),
                    }
                except Exception:
                    match = None
            if match is None:
                match = match_resume_to_job(
                    candidate_skills,
                    job_required_skills=job.skills_required,
                    job_requirements_text=job.description,
                )
            results.append({
                'job_id': str(job.id),
                'job_title': job.title,
                'job_company': job.company,
                'job_location': job.location,
                'job_type': job.job_type,
                'experience_level': job.experience_level,
                'match_score': match['match_score'],
                'matched_skills': match['matched_skills'],
                'missing_skills': match['missing_skills'],
            })

        # Sort by match score descending
        results.sort(key=lambda x: x['match_score'], reverse=True)
        return Response(results)

    @action(detail=False, methods=['post'], url_path='skill-gap')
    def skill_gap(self, request):
        """Job seeker: compute skills gap for a specific job."""
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
        match = match_resume_to_job(
            candidate_skills,
            job_required_skills=job.skills_required,
            job_requirements_text=job.description,
        )

        return Response({
            'job_id': str(job.id),
            'job_title': job.title,
            'match_score': match['match_score'],
            'matched_skills': match['matched_skills'],
            'missing_skills': match['missing_skills'],
            'candidate_skills': candidate_skills,
        })

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
            'applied_at': a.created_at,
            'cover_letter': a.cover_letter,
            'resume_file': a.resume.file.url if a.resume and a.resume.file else None,
        } for a in applications])
