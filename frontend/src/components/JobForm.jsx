import { useState } from 'react'
import { AlertIcon, SparklesIcon } from './Icons'
import { jobsApi } from '../api/jobs'
import { getApiError, jobTypeLabel, experienceLevelLabel } from '../utils/helpers'

const emptyForm = {
  title: '',
  description: '',
  company: '',
  location: '',
  job_type: 'full_time',
  experience_level: 'mid',
  salary_min: '',
  salary_max: '',
  requirements_text: '',
}

export default function JobForm({ initial, onSuccess, submitLabel = 'Create Job' }) {
  const [form, setForm] = useState(
    initial ? { ...emptyForm, ...initial, requirements_text: (initial.requirements || []).join('\n') } : { ...emptyForm }
  )
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiRequirements, setAiRequirements] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const validate = () => {
    const errors = {}
    if (!form.title.trim()) errors.title = 'Job title is required'
    if (!form.company.trim()) errors.company = 'Company name is required'
    if (!form.description.trim()) errors.description = 'Job description is required'
    return errors
  }

  const handleAnalyze = async () => {
    setError('')
    if (!form.description.trim()) {
      setFieldErrors({ description: 'Please enter a job description first to analyze.' })
      return
    }
    setAnalyzing(true)
    try {
      const jobRes = await jobsApi.create({
        ...form,
        requirements: form.requirements_text.split('\n').filter((r) => r.trim()),
        salary_min: form.salary_min || null,
        salary_max: form.salary_max || null,
      })
      const res = await jobsApi.analyze(jobRes.data.id)
      setAiRequirements(res.data)
      // Preselect skills
      alert('Job created and analyzed successfully.')
      onSuccess && onSuccess(jobRes.data)
    } catch (err) {
      setError(getApiError(err, 'Failed to create and analyze job.'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        requirements: form.requirements_text.split('\n').filter((r) => r.trim()),
        salary_min: form.salary_min || null,
        salary_max: form.salary_max || null,
      }
      const res = initial
        ? await jobsApi.update(initial.id, payload)
        : await jobsApi.create(payload)
      onSuccess && onSuccess(res.data)
    } catch (err) {
      setError(getApiError(err, 'Failed to save job.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card card-padded">
      {error && (
        <div className="alert alert-error mb-3">
          <AlertIcon size={16} /> {error}
        </div>
      )}

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Job Title *</label>
          <input type="text" name="title" className="form-control" placeholder="e.g. Senior React Developer"
            value={form.title} onChange={handleChange} />
          {fieldErrors.title && <div className="form-error">{fieldErrors.title}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Company *</label>
          <input type="text" name="company" className="form-control" placeholder="Company name"
            value={form.company} onChange={handleChange} />
          {fieldErrors.company && <div className="form-error">{fieldErrors.company}</div>}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Location</label>
          <input type="text" name="location" className="form-control" placeholder="City, State or Remote"
            value={form.location} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Job Type</label>
          <select name="job_type" className="form-control" value={form.job_type} onChange={handleChange}>
            {Object.entries(jobTypeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="form-group">
          <label className="form-label">Experience Level</label>
          <select name="experience_level" className="form-control" value={form.experience_level} onChange={handleChange}>
            {Object.entries(experienceLevelLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Salary Min (USD)</label>
          <input type="number" name="salary_min" className="form-control" placeholder="e.g. 60000"
            value={form.salary_min} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Salary Max (USD)</label>
          <input type="number" name="salary_max" className="form-control" placeholder="e.g. 90000"
            value={form.salary_max} onChange={handleChange} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Job Description *</label>
        <textarea name="description" className="form-control" style={{ minHeight: 160 }}
          placeholder="Describe the role, responsibilities, and requirements..."
          value={form.description} onChange={handleChange} />
        {fieldErrors.description && <div className="form-error">{fieldErrors.description}</div>}
      </div>

      <div className="form-group">
        <div className="flex-between mb-1">
          <label className="form-label" style={{ marginBottom: 0 }}>Key Requirements (one per line)</label>
          <span className="text-xs muted">Optional - will be extracted by AI</span>
        </div>
        <textarea name="requirements_text" className="form-control" style={{ minHeight: 100 }}
          placeholder={'Strong proficiency in JavaScript\nExperience with React and REST APIs\n...'}
          value={form.requirements_text} onChange={handleChange} />
      </div>

      <div className="flex gap-2 mt-3">
        <button type="button" className="btn btn-secondary" onClick={handleAnalyze} disabled={loading || analyzing}>
          {analyzing ? <span className="spinner" /> : <SparklesIcon size={16} />}
          {analyzing ? 'Analyzing...' : 'Create & Analyze with AI'}
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading || analyzing}>
          {loading && <span className="spinner" />}
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>

      {aiRequirements && (
        <div className="mt-4">
          <hr className="divider" />
          <h4 className="mb-2 flex gap-1" style={{ alignItems: 'center' }}><SparklesIcon size={18} color="var(--primary)" /> AI Analysis Results</h4>
          <div className="grid grid-2">
            <div>
              <div className="text-sm bold mb-1">Required Skills</div>
              <div className="skills-list">
                {(aiRequirements.required_skills || []).map((s, i) => (
                  <span key={i} className="skill-chip neutral">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm bold mb-1">Preferred Skills</div>
              <div className="skills-list">
                {(aiRequirements.preferred_skills || []).map((s, i) => (
                  <span key={i} className="skill-chip neutral">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
