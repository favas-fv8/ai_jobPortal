import { useEffect, useState, useCallback } from 'react'
import { statsApi } from '../../api/matching'
import StatCard from '../../components/ui/StatCard'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import Badge from '../../components/ui/Badge'
import {
  UsersIcon, BriefcaseIcon, FileIcon, SendIcon, SparklesIcon, UserIcon,
} from '../../components/Icons'
import { formatDateTime, roleBadgeColor } from '../../utils/helpers'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(() => {
    setLoading(true)
    statsApi
      .dashboard()
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) return <LoadingState message="Loading admin dashboard..." />
  if (error) return <ErrorState message={error} onRetry={fetchStats} />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">Platform-wide analytics and management</p>
        </div>
      </div>

      <div className="grid grid-4 mb-4">
        <StatCard icon={UsersIcon} label="Total Users" value={stats.total_users} color="primary" />
        <StatCard icon={BriefcaseIcon} label="Open Jobs" value={stats.open_jobs} color="success" />
        <StatCard icon={SendIcon} label="Applications" value={stats.total_applications} color="info" />
        <StatCard icon={FileIcon} label="Resumes" value={stats.total_resumes} color="warning" />
      </div>

      <div className="grid grid-4 mb-4">
        <StatCard icon={UserIcon} label="Recruiters" value={stats.total_recruiters} color="info" />
        <StatCard icon={UserIcon} label="Job Seekers" value={stats.total_jobseekers} color="success" />
        <StatCard icon={SparklesIcon} label="Profiles w/ Resume" value={stats.jobseekers_with_resume} color="primary" />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Recent Users</h3></div>
          <div className="card-body">
            {!stats.recent_users || stats.recent_users.length === 0 ? (
              <p className="muted text-sm">No users yet.</p>
            ) : (
              <div className="flex-column">
                {stats.recent_users.map((u) => (
                  <div key={u.id} className="gap-row">
                    <div className="flex gap-2" style={{ alignItems: 'center' }}>
                      <span className="avatar">{(u.username || '?').charAt(0).toUpperCase()}</span>
                      <div>
                        <div className="text-sm bold">{u.username}</div>
                        <div className="text-xs muted">{u.email}</div>
                      </div>
                    </div>
                    <Badge color={roleBadgeColor[u.role]}>{u.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Recent Jobs</h3></div>
          <div className="card-body">
            {!stats.recent_jobs || stats.recent_jobs.length === 0 ? (
              <p className="muted text-sm">No jobs posted yet.</p>
            ) : (
              <div className="flex-column">
                {stats.recent_jobs.map((j) => (
                  <div key={j.id} className="gap-row">
                    <div>
                      <div className="text-sm bold">{j.title}</div>
                      <div className="text-xs muted">{j.company} • {formatDateTime(j.created_at)}</div>
                    </div>
                    <Badge color={j.status === 'open' ? 'success' : 'secondary'}>{j.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
