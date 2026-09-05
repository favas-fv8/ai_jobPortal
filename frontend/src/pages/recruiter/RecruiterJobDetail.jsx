import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { jobsApi } from '../../api/jobs'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import JobForm from '../../components/JobForm'
import {
  EditIcon, LocationIcon, SendIcon, SparklesIcon,
} from '../../components/Icons'
import {
  formatDate, formatSalary, jobTypeLabel, experienceLevelLabel, statusBadgeColor, getApiError,
} from '../../utils/helpers'

export default function RecruiterJobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [editingJob, setEditingJob] = useState(false)

  const fetchJob = useCallback(() => {
    setLoading(true)
    setError('')
    jobsApi
      .get(id)
      .then((res) => setJob(res.data))
      .catch(() => setError('Failed to load job details.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    try {
      await jobsApi.analyze(id)
      const fresh = await jobsApi.get(id)
      setJob(fresh.data)
      alert('AI analysis completed. Skills and requirements extracted.')
    } catch (err) {
      setError(getApiError(err, 'Failed to analyze job.'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = (updated) => {
    setJob(updated)
    setEditingJob(false)
  }

  if (loading) return <LoadingState message="Loading job details..." />
  if (error && !job) return <ErrorState message={error} onRetry={fetchJob} />
  if (!job) return <ErrorState message="Job not found." onRetry={fetchJob} />

  const analysis = job.ai_analysis || {}

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="btn btn-outline btn-sm mb-2" onClick={() => navigate('/recruiter/jobs')}>
            &larr; Back to Jobs
          </button>
          <h1 className="page-title">{job.title}</h1>
          <p className="page-subtitle">{job.company}</p>
        </div>
        <Link to={`/recruiter/applicants?job=${job.id}`} className="btn btn-secondary">
          <SendIcon size={16} /> View Applicants
        </Link>
      </div>

      <div className="grid">
        <div className="card card-padded application-detail-card">
          <div className="flex-between mb-3 flex-wrap gap-2">
            <div>
              <div className="job-title">{job.title}</div>
              <div className="job-company">{job.company}</div>
              {job.location && (
                <div className="text-sm muted flex gap-1" style={{ alignItems: 'center' }}>
                  <LocationIcon size={14} /> {job.location}
                </div>
              )}
            </div>
            <div className="flex gap-1 flex-wrap" style={{ justifyContent: 'flex-end' }}>
              {job.ai_analyzed && (
                <Badge color="primary">
                  <SparklesIcon size={12} style={{ marginRight: 4 }} /> AI Analyzed
                </Badge>
              )}
              <Badge color={statusBadgeColor[job.status]}>{job.status}</Badge>
            </div>
          </div>

          <div className="job-meta mb-3">
            <Badge color="secondary">{jobTypeLabel[job.job_type] || job.job_type}</Badge>
            <Badge color="secondary">{experienceLevelLabel[job.experience_level] || job.experience_level}</Badge>
            <Badge color="primary">{formatSalary(job.salary_min, job.salary_max)}</Badge>
            <span className="badge badge-info">
              <SendIcon size={12} style={{ marginRight: 4 }} /> {job.application_count || 0} applications
            </span>
          </div>

          {!job.ai_analyzed && (
            <div className="mb-3">
              <button type="button" className="btn btn-secondary" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <span className="spinner" /> : <SparklesIcon size={16} />}
                {analyzing ? 'Analyzing...' : 'Analyze with AI'}
              </button>
              {error && <div className="form-error mt-2">{error}</div>}
            </div>
          )}

          {job.ai_analyzed && (
            <div className="card card-padded mb-3" style={{ background: 'var(--surface-2)' }}>
              <h4 className="mb-3 flex gap-1" style={{ alignItems: 'center' }}>
                <SparklesIcon size={18} color="var(--primary)" /> AI Analysis
              </h4>

              {(analysis.required_skills || []).length > 0 && (
                <div className="mb-3">
                  <div className="text-sm bold mb-1">Required Skills</div>
                  <div className="skills-list">
                    {(analysis.required_skills || []).map((s, i) => (
                      <span key={i} className="skill-chip neutral">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {(analysis.preferred_skills || []).length > 0 && (
                <div className="mb-3">
                  <div className="text-sm bold mb-1">Preferred Skills</div>
                  <div className="skills-list">
                    {(analysis.preferred_skills || []).map((s, i) => (
                      <span key={i} className="skill-chip neutral">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {(analysis.key_requirements || []).length > 0 && (
                <div className="mb-3">
                  <div className="text-sm bold mb-1">Key Requirements</div>
                  <ul className="text-sm" style={{ marginLeft: 18 }}>
                    {(analysis.key_requirements || []).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {analysis.experience_level && (
                <div className="mb-3">
                  <div className="text-sm bold mb-1">Experience Level</div>
                  <div className="text-sm">{analysis.experience_level}</div>
                </div>
              )}

              {(analysis.qualifications || []).length > 0 && (
                <div className="mb-3">
                  <div className="text-sm bold mb-1">Qualifications</div>
                  <ul className="text-sm" style={{ marginLeft: 18 }}>
                    {(analysis.qualifications || []).map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mb-3">
            <div className="text-sm bold mb-1">Description</div>
            <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{job.description || 'No description provided.'}</p>
          </div>

          {job.requirements?.length > 0 && (
            <div className="mb-3">
              <div className="text-sm bold mb-1">Requirements</div>
              <ul className="text-sm" style={{ marginLeft: 18 }}>
                {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {job.responsibilities?.length > 0 && (
            <div className="mb-3">
              <div className="text-sm bold mb-1">Responsibilities</div>
              <ul className="text-sm" style={{ marginLeft: 18 }}>
                {job.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {job.skills_required?.length > 0 && (
            <div className="mb-3">
              <div className="text-sm bold mb-1">Skills Required</div>
              <div className="skills-list">
                {job.skills_required.map((s, i) => (
                  <span key={i} className="skill-chip neutral">{s}</span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs muted">Posted {formatDate(job.created_at)}</p>

          <div className="divider" style={{ margin: '16px 0' }} />

          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/recruiter/jobs')}>Back</button>
            <button className="btn btn-primary" onClick={() => setEditingJob(true)}>
              <EditIcon size={15} /> Edit Job
            </button>
          </div>
        </div>
      </div>

      <Modal open={editingJob} onClose={() => setEditingJob(false)} title="Edit Job" size="lg">
        <JobForm initial={job} onSuccess={handleSave} submitLabel="Save Changes" />
      </Modal>
    </div>
  )
}