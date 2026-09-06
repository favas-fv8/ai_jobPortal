from core.ai_services.parser import extract_resume_text
from core.matching.matching_service import match_resume_to_job, extract_keywords


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


def ensure_application_match(application):
    """Populate/refresh an application's match data from already-saved data.

    Uses the resume skills extracted during resume analysis and the job's
    requirements/skills from the job AI analysis — no Gemini call is made.

    Real AI (Gemini) analysis is never overwritten here. Locally computed
    matches are refreshed when the resume or job has been updated since the
    match was written, so both seeker and recruiter pages stay in sync with
    the latest analysis data.
    """
    if application.is_ai_analyzed:
        return
    resume = application.resume
    job = application.job
    if resume is None:
        return

    source_updated = job.updated_at
    if resume.updated_at and resume.updated_at > source_updated:
        source_updated = resume.updated_at

    if application.match_score is not None and application.match_source == 'local' \
            and application.updated_at >= source_updated:
        return

    required_skills = list(job.skills_required or [])
    job_analysis = job.ai_analysis or {}
    if not required_skills and job_analysis.get('required_skills'):
        required_skills = list(job_analysis['required_skills'])

    match = match_resume_to_job(
        _candidate_skills(resume),
        job_required_skills=required_skills,
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