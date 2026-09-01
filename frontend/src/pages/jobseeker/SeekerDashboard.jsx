import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { statsApi } from '../../api/matching'
import StatCard from '../../components/ui/StatCard'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import {
  FileIcon, SendIcon, SparklesIcon, ActivityIcon, TargetIcon, UploadIcon,
} from '../../components/Icons'
import { formatDateTime, applicationStatusLabel, statusBadgeColor } from '../../utils/helpers'

export default function SeekerDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(() => {
    setLoading(true)
    setError('')
    statsApi
      .dashboard()
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load dashboard.'))
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
          <h1 className="page-title">My Job Seeker Dashboard</h1>
          <p className="page-subtitle">Track your applications and AI-powered recommendations</p>
        </div>
        <Link to="/seeker/recommendations" className="btn btn-primary">
          <SparklesIcon size={16} /> AI Recommendations
        </Link>
      </div>

      {!stats.has_analyzed_resume && (
        <div className="alert alert-info mb-4">
          <UploadIcon size={16} />
          <span>
            Upload and analyze your resume to unlock AI matching and personalized job recommendations.{' '}
            <Link to="/seeker/resume">Upload now</Link>
          </span>
        </div>
      )}

      <div className="grid grid-4 mb-4">
        <StatCard icon={FileIcon} label="Resumes" value={stats.total_resumes} color="primary" />
        <StatCard icon={TargetIcon} label="Skills Extracted" value={stats.total_skills} color="success" />
        <StatCard icon={SendIcon} label="Applications" value={stats.total_applications} color="info" />
        <StatCard icon={ActivityIcon} label="Avg Match Score" value={`${avgScore}%`} color="warning" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">My Applications</h3>
          <Link to="/seeker/applications" className="text-sm">View all</Link>
        </div>
        <div className="card-body">
          {!stats.recent_applications || stats.recent_applications.length === 0 ? (
            <EmptyState
              icon={BriefcasePlaceholder}
              title="No applications yet"
              description="Browse jobs and apply to start tracking your applications here."
              action={<Link to="/seeker/jobs" className="btn btn-primary btn-sm">Browse Jobs</Link>}
            />
          ) : (
            <div className="flex-column">
              {stats.recent_applications.map((a) => (
                <div key={a.id} className="gap-row">
                  <div>
                    <div className="text-sm bold">{a.job__title || 'Job'}</div>
                    <div className="text-xs muted">{formatDateTime(a.created_at)} {a.match_score != null && `| Match ${Math.round(a.match_score)}%`}</div>
                  </div>
                  <Badge color={statusBadgeColor[a.status]}>{applicationStatusLabel[a.status] || a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BriefcasePlaceholder(props) {
  return <SendIcon {...props} />
}
