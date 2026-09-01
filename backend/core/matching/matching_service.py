"""Application-code matching logic.

This module implements deterministic skill comparison, skill-gap
calculation, and match-score computation. AI (Gemini) provides structured
extraction; the deterministic scoring/ranking lives here.
"""
import re
from difflib import SequenceMatcher


def normalize_skill(name):
    """Normalize a skill name for comparison."""
    if not name:
        return ''
    text = str(name).strip().lower()
    text = re.sub(r'[^a-z0-9+#.\- ]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def tokenize_skills(skills):
    """Convert a list of skills into a set of normalized tokens."""
    tokens = set()
    for skill in skills or []:
        norm = normalize_skill(skill)
        if norm:
            tokens.add(norm)
    return tokens


def skill_similarity(s1, s2):
    """Compute similarity between two normalized skill strings (0-1)."""
    n1, n2 = normalize_skill(s1), normalize_skill(s2)
    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0
    # Direct token overlap
    t1, t2 = set(n1.split()), set(n2.split())
    if t1 and t2:
        overlap = len(t1 & t2)
        if overlap > 0:
            return overlap / max(len(t1), len(t2))
    # Fuzzy ratio
    return SequenceMatcher(None, n1, n2).ratio()


def compare_skills(candidate_skills, required_skills, threshold=0.85):
    """Compare candidate skills against required skills.

    Returns (matched, missing) where each is a list of required-skill
    strings annotated with whether they matched.
    """
    matched = []
    missing = []
    candidate_tokens = tokenize_skills(candidate_skills)

    for req in required_skills or []:
        norm_req = normalize_skill(req)
        if not norm_req:
            continue
        is_match = norm_req in candidate_tokens
        if not is_match:
            # fuzzy fallback
            best = 0.0
            for cand in candidate_tokens:
                sim = skill_similarity(norm_req, cand)
                if sim > best:
                    best = sim
            if best >= threshold:
                is_match = True
        if is_match:
            matched.append(req)
        else:
            missing.append(req)

    return matched, missing


def calculate_match_score(matched_count, required_count, candidate_skills,
                          required_skills, preferred_skills=None):
    """Compute a deterministic match score 0-100.

    Score is primarily driven by the ratio of matched required skills, with
    a bonus for preferred skills the candidate also possesses.
    """
    if required_count == 0:
        # No structured required skills; fall back to overall ratio
        if not candidate_skills:
            return 0.0
        return 50.0

    base = (matched_count / required_count) * 100.0

    # Bonus up to 5 points for preferred skills
    bonus = 0.0
    if preferred_skills:
        _, pref_missing = compare_skills(candidate_skills, preferred_skills)
        pref_matched = len(preferred_skills) - len(pref_missing)
        if preferred_skills:
            bonus = (pref_matched / len(preferred_skills)) * 5.0

    return round(min(100.0, base + bonus), 2)


def match_resume_to_job(candidate_skills, job_required_skills=None,
                        job_preferred_skills=None, job_requirements_text=None):
    """Full deterministic match: returns dict with score, matched, missing.

    If job_required_skills is empty, attempts lightweight keyword extraction
    from requirements text.
    """
    required_skills = list(job_required_skills or [])
    preferred_skills = list(job_preferred_skills or [])

    # Lightweight keyword extraction fallback when skills weren't AI-analyzed
    if not required_skills and job_requirements_text:
        required_skills = extract_keywords(job_requirements_text)

    matched, missing = compare_skills(candidate_skills, required_skills)
    score = calculate_match_score(
        len(matched), len(required_skills), candidate_skills,
        required_skills, preferred_skills
    )

    return {
        'match_score': score,
        'matched_skills': matched,
        'missing_skills': missing,
        'required_skill_total': len(required_skills),
    }


def extract_keywords(text):
    """A simple fallback keyword extractor (not AI).

    Pulls capitalized technical terms and software-ish tokens.
    """
    if not text:
        return []
    common_skills = [
        'python', 'javascript', 'typescript', 'react', 'node', 'django', 'flask',
        'sql', 'postgresql', 'mysql', 'mongodb', 'aws', 'azure', 'docker',
        'kubernetes', 'git', 'java', 'c++', 'c#', 'go', 'rust', 'ruby',
        'machine learning', 'deep learning', 'nlp', 'tensorflow', 'pytorch',
        'html', 'css', 'rest api', 'graphql', 'redis', 'data science',
        'data analysis', 'project management', 'agile', 'scrum', 'communication',
    ]
    found = []
    text_lower = text.lower()
    for skill in common_skills:
        if skill in text_lower:
            found.append(skill.title())
    return found
