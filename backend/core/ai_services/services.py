import json
from .gemini_client import get_gemini_client
from .schemas import (
    RESUME_ANALYSIS_SCHEMA,
    JOB_ANALYSIS_SCHEMA,
    RESUME_ANALYSIS_PROMPT,
    JOB_ANALYSIS_PROMPT,
    JOB_APPLICATION_MATCH_PROMPT,
    JOB_APPLICATION_MATCH_SCHEMA,
    RESUME_VALIDATION_SCHEMA,
    RESUME_VALIDATION_PROMPT,
)


def validate_resume_text(document_text):
    """Determine whether the extracted document text is actually a resume.

    Uses Gemini to classify the document and explain the decision. When Gemini
    is unavailable, a lightweight local heuristic is used instead.
    """
    text = (document_text or '').strip()
    client = get_gemini_client()
    if not client.available:
        return _local_resume_validation(text)

    prompt = RESUME_VALIDATION_PROMPT.format(
        schema=json.dumps(RESUME_VALIDATION_SCHEMA),
        document_text=text[:40000] or '(empty)',
    )
    result = client.generate_content(prompt, response_schema=RESUME_VALIDATION_SCHEMA)
    result = dict(result or {})
    result['is_resume'] = bool(result.get('is_resume'))
    result.setdefault('reason', '')
    return result


def analyze_resume(resume_text):
    """Analyze resume text with Gemini and return structured data."""
    client = get_gemini_client()
    if not client.available:
        # Fallback to a minimal local extraction (no AI) for resilience
        return _local_resume_extraction(resume_text)

    prompt = RESUME_ANALYSIS_PROMPT.format(
        schema=json.dumps(RESUME_ANALYSIS_SCHEMA),
        resume_text=resume_text[:40000],
    )
    return client.generate_content(prompt, response_schema=RESUME_ANALYSIS_SCHEMA)


def analyze_job_description(job_description):
    """Analyze job description with Gemini and return structured requirements."""
    client = get_gemini_client()
    if not client.available:
        return _local_job_extraction(job_description)

    prompt = JOB_ANALYSIS_PROMPT.format(
        schema=json.dumps(JOB_ANALYSIS_SCHEMA),
        job_description=job_description[:40000],
    )
    return client.generate_content(prompt, response_schema=JOB_ANALYSIS_SCHEMA)


def analyze_job_application(job_description, resume_text, candidate_skills=None):
    """Analyze a candidate's resume against a job description with Gemini."""
    client = get_gemini_client()
    if not client.available:
        return _local_application_match(job_description, resume_text, candidate_skills)

    skills_text = json.dumps(candidate_skills or [])
    prompt = JOB_APPLICATION_MATCH_PROMPT.format(
        schema=json.dumps(JOB_APPLICATION_MATCH_SCHEMA),
        job_description=job_description[:30000],
        resume_text=resume_text[:30000],
        candidate_skills=skills_text,
    )
    return client.generate_content(prompt, response_schema=JOB_APPLICATION_MATCH_SCHEMA)


# ---------------------------------------------------------------------------
# Local fallback extraction (used only when Gemini is unavailable).
# These are intentionally simple and deterministic.
# ---------------------------------------------------------------------------

def _local_resume_validation(text):
    if not text:
        return {
            'is_resume': False,
            'reason': 'This document appears to be empty or image-only (scanned) with no readable text. Please upload a text-based resume.',
        }
    keywords = [
        'experience', 'education', 'skill', 'work', 'employment', 'resume',
        'curriculum', 'objective', 'summary', 'project', 'certification',
        'contact', 'email', 'linkedin', 'phone',
    ]
    low = text.lower()
    hits = sum(1 for k in keywords if k in low)
    if hits < 3 or len(text) < 100:
        return {
            'is_resume': False,
            'reason': 'This document does not appear to be a resume (image, video transcript, presentation, or other document). Please upload a real resume.',
        }
    return {'is_resume': True, 'reason': ''}


def _local_resume_extraction(text):
    return {
        "full_name": "",
        "email": "",
        "phone": "",
        "location": "",
        "summary": "",
        "skills": [],
        "education": [],
        "experience": [],
        "certifications": [],
    }


def _local_job_extraction(text):
    return {
        "required_skills": [],
        "preferred_skills": [],
        "key_requirements": [],
        "experience_level": "",
        "qualifications": [],
    }


def _local_application_match(job_text, resume_text, candidate_skills):
    return {
        "match_score": 0,
        "matched_skills": list(candidate_skills or []),
        "missing_skills": [],
        "strengths": [],
        "gaps": [],
        "recommendation": "AI analysis unavailable. Please review the application manually.",
    }
