import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { statsApi } from '../../api/matching'
import StatCard from '../../components/ui/StatCard'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import {
  BriefcaseIcon, UsersIcon, SparklesIcon, PlusIcon, TargetIcon, TrendingUpIcon,
} from '../../components/Icons'
import { formatDateTime, applicationStatusLabel, statusBadgeColor } from '../../utils/helpers'

export default function RecruiterDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(() => {
    setLoading(true)
    setError('')
    statsApi
      .dashboard()
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load dashboard statistics.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) return <LoadingState message="Loading your dashboard..." />
  if (error) return <ErrorState message={error} onRetry={fetchStats} />

  const avgScore = Math.round(stats.avg_match_score || 0)

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Recruiter Overview</h1>
          <p className="page-subtitle">Manage your job postings and evaluate candidates</p>
        </div>
        <Link to="/recruiter/new-job" className="btn btn-primary">
          <PlusIcon size={16} /> Post a Job
        </Link>
      </div>

      <div className="grid grid-4 mb-4">
        <StatCard icon={BriefcaseIcon} label="Total Jobs" value={stats.total_jobs} color="primary" />
        <StatCard icon={TrendingUpIcon} label="Open Jobs" value={stats.open_jobs} color="success" />
        <StatCard icon={UsersIcon} label="Total Applications" value={stats.total_applications} color="info" />
        <StatCard
          icon={TargetIcon}
          label="Avg AI Match Score"
          value={`${avgScore}%`}
          color="warning"
          sub={`${stats.ai_analyzed_applications} analyzed`}
        />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Top Jobs</h3>
            <Link to="/recruiter/jobs" className="text-sm">View all</Link>
          </div>
          <div className="card-body">
            {!stats.top_jobs || stats.top_jobs.length === 0 ? (
              <EmptyState
                icon={BriefcaseIcon}
                title="No jobs posted yet"
                description="Create your first job posting to start receiving applications."
                action={<Link to="/recruiter/new-job" className="btn btn-primary btn-sm"><PlusIcon size={14} /> Post a Job</Link>}
              />
            ) : (
              <div className="flex-column">
                {stats.top_jobs.map((job) => (
                  <div key={job.id} className="gap-row">
                    <div>
                      <div className="bold text-sm">{job.title}</div>
                      <div className="text-xs muted">{job.apps} applications</div>
                    </div>
                    <Badge color={statusBadgeColor[job.status]}>{job.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Applications</h3>
            <Link to="/recruiter/applicants" className="text-sm">View applicants</Link>
          </div>
          <div className="card-body">
            {!stats.recent_applications || stats.recent_applications.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title="No applications yet"
                description="Applications from candidates will appear here for AI review."
              />
            ) : (
              <div className="flex-column">
                {stats.recent_applications.map((a) => (
                  <div key={a.id} className="gap-row">
                    <div>
                      <div className="text-sm bold">{a.applicant_name || a.applicant_username}</div>
                      <div className="text-xs muted">{formatDateTime(a.created_at)}</div>
                    </div>
                    <div className="flex gap-2" style={{ alignItems: 'center' }}>
                      <Badge color={statusBadgeColor[a.status]}>{applicationStatusLabel[a.status] || a.status}</Badge>
                    </div>
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
