import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { applicationsApi } from '../../api/applications'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import MatchScore from '../../components/ui/MatchScore'
import {
  SendIcon, EyeIcon, XIcon,
} from '../../components/Icons'
import { formatDateTime, applicationStatusLabel, getApiError } from '../../utils/helpers'

const statusBadgeMap = {
  submitted: 'info',
  under_review: 'warning',
  interview: 'primary',
  offer: 'success',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'secondary',
}

export default function SeekerApplications() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  const fetchApplications = useCallback(() => {
    setLoading(true)
    applicationsApi
      .myApplications()
      .then((res) => setApplications(res.data))
      .catch(() => setError('Failed to load your applications.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const handleCancel = async (app) => {
    if (!window.confirm(`Cancel your application for "${app.job_title}"? Your application will be withdrawn.`)) return
    setCancellingId(app.id)
    try {
      await applicationsApi.withdraw(app.id)
      setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: 'withdrawn' } : a)))
      alert('Application cancelled.')
    } catch (err) {
      alert(getApiError(err, 'Failed to cancel application.'))
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return <LoadingState message="Loading your applications..." />
  if (error) return <ErrorState message={error} onRetry={fetchApplications} />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">My Applications</h1>
          <p className="page-subtitle">Track the status of your job applications</p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={SendIcon}
            title="No applications yet"
            description="Browse jobs and apply to start tracking your applications here."
            action={<a href="/seeker/jobs" className="btn btn-primary">Browse Jobs</a>}
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Company</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th>AI Match</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => {
                  const isWithdrawn = a.status === 'withdrawn'
                  return (
                    <tr
                      key={a.id}
                      className="clickable-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/seeker/applications/${a.id}`)}
                      title="View application details"
                    >
                      <td className="bold text-sm">{a.job_title}</td>
                      <td className="text-sm">{a.job_company}</td>
                      <td className="text-sm muted">{formatDateTime(a.created_at)}</td>
                      <td><Badge color={statusBadgeMap[a.status] || 'secondary'}>{applicationStatusLabel[a.status] || a.status}</Badge></td>
                      <td>
                        {a.is_ai_analyzed && a.match_score != null ? (
                          <MatchScore score={a.match_score} showLabel={false} />
                        ) : (
                          <span className="text-xs muted">Pending recruiter review</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1" style={{ alignItems: 'center' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/seeker/applications/${a.id}`)}>
                            <EyeIcon size={14} /> View
                          </button>
                          {!isWithdrawn && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleCancel(a)}
                              disabled={cancellingId === a.id}
                              title="Cancel application"
                            >
                              {cancellingId === a.id ? <span className="spinner" /> : <XIcon size={14} />}
                              {cancellingId === a.id ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
