import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { applicationsApi } from '../../api/applications'
import { jobsApi } from '../../api/jobs'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import Badge from '../../components/ui/Badge'
import MatchScore from '../../components/ui/MatchScore'
import {
  XIcon, LocationIcon,
} from '../../components/Icons'
import {
  formatDate, formatSalary, jobTypeLabel, experienceLevelLabel, applicationStatusLabel, getApiError,
} from '../../utils/helpers'

const statusBadgeMap = {
  submitted: 'info',
  under_review: 'warning',
  interview: 'primary',
  offer: 'success',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'secondary',
}

export default function SeekerApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const fetchDetail = useCallback(() => {
    setLoading(true)
    setError('')
    applicationsApi
      .get(id)
      .then((res) => {
        setApplication(res.data)
        const jobId = res.data?.job
        if (jobId) {
          return jobsApi.get(jobId).then((jres) => setJob(jres.data))
        }
      })
      .catch(() => setError('Failed to load application details.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const handleCancel = async () => {
    if (!window.confirm('Cancel this application? Your application will be withdrawn.')) return
    setCancelling(true)
    try {
      const res = await applicationsApi.withdraw(id)
      setApplication(res.data)
      alert('Application cancelled.')
    } catch (err) {
      alert(getApiError(err, 'Failed to cancel application.'))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <LoadingState message="Loading application details..." />
  if (error) return <ErrorState message={error} onRetry={fetchDetail} />
  if (!application) return <ErrorState message="Application not found." onRetry={fetchDetail} />

  const jobTitle = job?.title || application.job_title
  const company = job?.company || application.job_company
  const isWithdrawn = application.status === 'withdrawn'

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="btn btn-outline btn-sm mb-2" onClick={() => navigate('/seeker/applications')}>
            &larr; Back to Applications
          </button>
          <h1 className="page-title">{jobTitle}</h1>
          <p className="page-subtitle">{company}</p>
        </div>
      </div>

      <div className="grid">
        <div className="card card-padded application-detail-card">
          <div className="flex-between mb-3 flex-wrap gap-2">
            <div>
              <div className="job-title">{job?.title || application.job_title}</div>
              <div className="job-company">{job?.company || application.job_company}</div>
              {job?.location && <div className="text-sm muted flex gap-1" style={{ alignItems: 'center' }}><LocationIcon size={14} /> {job.location}</div>}
            </div>
          </div>

          <div className="job-meta mb-3">
            {job && <Badge color="secondary">{jobTypeLabel[job.job_type] || job.job_type}</Badge>}
            {job && <Badge color="secondary">{experienceLevelLabel[job.experience_level] || job.experience_level}</Badge>}
            {job && <Badge color="primary">{formatSalary(job.salary_min, job.salary_max)}</Badge>}
            <Badge color="info">Applied {formatDate(application.created_at)}</Badge>
            <Badge color={statusBadgeMap[application.status] || 'secondary'}>{applicationStatusLabel[application.status] || application.status}</Badge>
          </div>

          {application.match_score != null && (
            <div className="mb-3">
              <div className="text-sm bold mb-1">AI Match</div>
              <MatchScore score={application.match_score} showLabel={false} />
            </div>
          )}

          {job && (
            <>
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
            </>
          )}

          {application.cover_letter && (
            <div className="mb-3">
              <div className="text-sm bold mb-1">Your Cover Letter</div>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{application.cover_letter}</p>
            </div>
          )}

          <p className="text-xs muted">
            {job ? `Posted ${formatDate(job.created_at)}` : ''}
            {job ? ' · ' : ''}Applied {formatDate(application.created_at)}
          </p>

          <div className="divider" style={{ margin: '16px 0' }} />

          {isWithdrawn ? (
            <div className="flex gap-2" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
              <span className="text-sm muted">This application has been withdrawn.</span>
              <Link to="/seeker/jobs" className="btn btn-primary">Browse Jobs</Link>
            </div>
          ) : (
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/seeker/applications')}>Back</button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? <span className="spinner" /> : <XIcon size={15} />}
                {cancelling ? 'Cancelling...' : 'Cancel Application'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
