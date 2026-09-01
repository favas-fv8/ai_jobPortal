import { useEffect, useState, useCallback } from 'react'
import { applicationsApi } from '../../api/applications'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import MatchScore from '../../components/ui/MatchScore'
import {
  SendIcon, SearchIcon,
} from '../../components/Icons'
import { formatDateTime, applicationStatusLabel } from '../../utils/helpers'

const statusBadgeMap = {
  submitted: 'info',
  under_review: 'warning',
  interview: 'primary',
  offer: 'success',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'secondary',
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchApplications = useCallback(() => {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    if (search) params.search = search
    applicationsApi
      .list(params)
      .then((res) => setApplications(res.data.results || res.data))
      .catch(() => setError('Failed to load applications.'))
      .finally(() => setLoading(false))
  }, [statusFilter, search])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  if (loading) return <LoadingState message="Loading applications..." />
  if (error) return <ErrorState message={error} onRetry={fetchApplications} />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">All Applications</h1>
          <p className="page-subtitle">View all job applications across the platform</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="input-icon-wrap" style={{ flex: 1, minWidth: 200 }}>
          <SearchIcon size={16} />
          <input type="text" className="form-control" placeholder="Search by candidate or job..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(applicationStatusLabel).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {applications.length === 0 ? (
        <div className="card">
          <EmptyState icon={SendIcon} title="No applications found" description="No applications match your filters." />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Status</th>
                  <th>AI Match</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <span className="avatar">{(a.applicant_name || a.applicant_username || '?').charAt(0).toUpperCase()}</span>
                        <div>
                          <div className="bold text-sm">{a.applicant_name || a.applicant_username}</div>
                          <div className="text-xs muted">{a.applicant_username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{a.job_title}<div className="text-xs muted">{a.job_company}</div></td>
                    <td><Badge color={statusBadgeMap[a.status] || 'secondary'}>{applicationStatusLabel[a.status] || a.status}</Badge></td>
                    <td>
                      {a.is_ai_analyzed && a.match_score != null ? (
                        <MatchScore score={a.match_score} showLabel={false} />
                      ) : (
                        <span className="text-xs muted">Not analyzed</span>
                      )}
                    </td>
                    <td className="text-sm muted">{formatDateTime(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
