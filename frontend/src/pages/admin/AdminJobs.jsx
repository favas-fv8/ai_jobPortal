import { useEffect, useState, useCallback } from 'react'
import { jobsApi } from '../../api/jobs'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import {
  BriefcaseIcon, TrashIcon, EditIcon, SearchIcon, LocationIcon,
} from '../../components/Icons'
import { formatDate, formatSalary, jobTypeLabel, statusBadgeColor, getApiError } from '../../utils/helpers'
import JobForm from '../../components/JobForm'

export default function AdminJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  const fetchJobs = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    jobsApi
      .list(params)
      .then((res) => setJobs(res.data.results || res.data))
      .catch(() => setError('Failed to load jobs.'))
      .finally(() => setLoading(false))
  }, [search, statusFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete job "${job.title}"?`)) return
    try {
      await jobsApi.delete(job.id)
      fetchJobs()
    } catch (err) {
      alert(getApiError(err, 'Failed to delete job.'))
    }
  }

  if (loading) return <LoadingState message="Loading jobs..." />
  if (error) return <ErrorState message={error} onRetry={fetchJobs} />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">All Jobs</h1>
          <p className="page-subtitle">Manage all job postings across the platform</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="input-icon-wrap" style={{ flex: 1, minWidth: 200 }}>
          <SearchIcon size={16} />
          <input type="text" className="form-control" placeholder="Search jobs..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="filled">Filled</option>
        </select>
      </div>

      {jobs.length === 0 ? (
        <div className="card">
          <EmptyState icon={BriefcaseIcon} title="No jobs found" description="No jobs match your filters." />
        </div>
      ) : (
        <div className="grid">
          {jobs.map((job) => (
            <div key={job.id} className="card card-padded job-card">
              <div className="job-card-top">
                <div>
                  <h3 className="job-title">{job.title}</h3>
                  <div className="job-company">{job.company} • <span className="muted">{job.recruiter_name}</span></div>
                </div>
                <Badge color={statusBadgeColor[job.status]}>{job.status}</Badge>
              </div>
              <div className="job-meta">
                <Badge color="secondary">{jobTypeLabel[job.job_type] || job.job_type}</Badge>
                {job.location && <Badge color="secondary">{job.location}</Badge>}
                <Badge color="info">{job.application_count || 0} applications</Badge>
              </div>
              <div className="text-sm muted">{formatSalary(job.salary_min, job.salary_max)}</div>
              <div className="text-xs muted">Posted {formatDate(job.created_at)}</div>
              <div className="divider" style={{ margin: '8px 0' }} />
              <div className="flex gap-1">
                <button className="btn btn-sm btn-outline" onClick={() => setViewing(job)}><EditIcon size={14} /> View</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setEditing(job)}><EditIcon size={14} /> Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(job)}><TrashIcon size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Job" size="lg">
        {editing && <JobForm initial={editing} onSuccess={() => { setEditing(null); fetchJobs() }} submitLabel="Save Changes" />}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title} size="lg">
        {viewing && (
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge color="secondary">{jobTypeLabel[viewing.job_type]}</Badge>
              <Badge color="secondary">{viewing.experience_level}</Badge>
              <Badge color={statusBadgeColor[viewing.status]}>{viewing.status}</Badge>
            </div>
            <div className="text-sm muted mb-2">{viewing.company} • {viewing.location || 'Remote'} • {formatSalary(viewing.salary_min, viewing.salary_max)}</div>
            <div className="mb-3">
              <div className="text-sm bold mb-1">Description</div>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{viewing.description}</p>
            </div>
            {viewing.requirements?.length > 0 && (
              <div className="mb-3">
                <div className="text-sm bold mb-1">Requirements</div>
                <ul className="text-sm" style={{ marginLeft: 18 }}>
                  {viewing.requirements.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {viewing.skills?.length > 0 && (
              <div>
                <div className="text-sm bold mb-1">Skills</div>
                <div className="skills-list">
                  {viewing.skills.map((s, i) => <span key={i} className="skill-chip neutral">{s.name}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
