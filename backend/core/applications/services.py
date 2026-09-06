from core.ai_services.parser import extract_resume_text
from core.matching.matching_service import (
    extract_keywords, match_resume_to_job, resolve_required_skills,
)
from core.matching.models import Recommendation


def _candidate_skills(resume):
    """Reuse skills already extracted by the resume AI analysis.

    Falls back to lightweight local keyword extraction from the resume text
    so matching works even before the resume has been analyzed.
    """
    if resume.skills:
        return list(resume.skills)
    text = resume.parsed_raw_text or ''
    if not text and resume.file and resume.file.path:
        try:
            text = extract_resume_text(resume.file.path, resume.file_format)
        except Exception:
            text = ''
    return extract_keywords(text) if text else []


def _mirror_recommendation(application, recommendation):
    """Reflect a persisted (resume, job) recommendation onto the application.

    The recommendations page shows this persisted recommendation, so the
    application page mirrors it to keep both pages identical for every job.
    """
    is_ai = recommendation.source == 'ai'
    unchanged = (
        application.match_score == recommendation.match_score
        and list(application.matched_skills or []) == (recommendation.matched_skills or [])
        and list(application.missing_skills or []) == (recommendation.missing_skills or [])
        and application.match_source == recommendation.source
        and application.is_ai_analyzed == is_ai
    )
    if unchanged:
        return

    application.match_score = recommendation.match_score
    application.matched_skills = recommendation.matched_skills or []
    application.missing_skills = recommendation.missing_skills or []
    application.ai_analysis = {
        'match_score': recommendation.match_score,
        'matched_skills': recommendation.matched_skills or [],
        'missing_skills': recommendation.missing_skills or [],
    }
    application.match_source = recommendation.source
    application.is_ai_analyzed = is_ai
    application.save(update_fields=[
        'match_score', 'matched_skills', 'missing_skills', 'ai_analysis',
        'match_source', 'is_ai_analyzed', 'updated_at',
    ])


def ensure_application_match(application):
    """Populate/refresh an application's match data from already-saved data.

    Uses the persisted recommendation for (resume, job) when one exists so the
    seeker's applications page shows the exact same AI match as the
    recommendations page. Otherwise uses the resume skills extracted during
    resume analysis and the job's requirements/skills — no Gemini call is made.

    Real AI (Gemini) analysis is never overwritten here. Locally computed
    matches are refreshed when the resume or job has been updated since the
    match was written, so both seeker and recruiter pages stay in sync with
    the latest analysis data.
    """
    resume = application.resume
    job = application.job
    if resume is None:
        return

    recommendation = Recommendation.objects.filter(resume=resume, job=job).first()
    if recommendation is not None:
        _mirror_recommendation(application, recommendation)
        return

    if application.is_ai_analyzed:
        return

    source_updated = job.updated_at
    if resume.updated_at and resume.updated_at > source_updated:
        source_updated = resume.updated_at

    if application.match_score is not None and application.match_source == 'local' \
            and application.updated_at >= source_updated:
        return

    match = match_resume_to_job(
        _candidate_skills(resume),
        job_required_skills=resolve_required_skills(job),
        job_requirements_text=job.description,
    )

    application.match_score = match['match_score']
    application.matched_skills = match['matched_skills']
    application.missing_skills = match['missing_skills']
    application.ai_analysis = match
    application.match_source = 'local'
    application.save(update_fields=[
        'match_score', 'matched_skills', 'missing_skills', 'ai_analysis',
        'match_source', 'updated_at',
    ])