import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi } from '../../api/jobs'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import JobForm from '../../components/JobForm'
import {
  PlusIcon, BriefcaseIcon, EditIcon, TrashIcon, SendIcon, LocationIcon,
} from '../../components/Icons'
import {
  formatDate, formatSalary, jobTypeLabel, experienceLevelLabel, statusBadgeColor,
} from '../../utils/helpers'

export default function RecruiterJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingJob, setEditingJob] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchJobs = useCallback(() => {
    setLoading(true)
    jobsApi
      .list()
      .then((res) => setJobs(res.data.results || res.data))
      .catch(() => setError('Failed to load your jobs.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await jobsApi.delete(deleteTarget.id)
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('Failed to delete the job.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = (updated) => {
    setJobs((prev) => {
      const exists = prev.some((j) => j.id === updated.id)
      return exists ? prev.map((j) => (j.id === updated.id ? updated : j)) : [updated, ...prev]
    })
    setEditingJob(null)
  }

  if (loading) return <LoadingState message="Loading your jobs..." />
  if (error) return <ErrorState message={error} onRetry={fetchJobs} />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">My Job Postings</h1>
          <p className="page-subtitle">Create, manage, and track your job openings</p>
        </div>
        <Link to="/recruiter/new-job" className="btn btn-primary">
          <PlusIcon size={16} /> Post a Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BriefcaseIcon}
            title="No job postings yet"
            description="Post your first job and let AI analyze the requirements to find the best candidates."
            action={<Link to="/recruiter/new-job" className="btn btn-primary"><PlusIcon size={14} /> Post a Job</Link>}
          />
        </div>
      ) : (
        <div className="grid">
          {jobs.map((job) => (
            <div key={job.id} className="card card-padded job-card">
              <div className="job-card-top">
                <div>
                  <h3 className="job-title">{job.title}</h3>
                  <div className="job-company">{job.company}</div>
                </div>
                <Badge color={statusBadgeColor[job.status]}>{job.status}</Badge>
              </div>
              <div className="job-meta">
                <Badge color="secondary">{jobTypeLabel[job.job_type] || job.job_type}</Badge>
                <Badge color="secondary">{experienceLevelLabel[job.experience_level] || job.experience_level}</Badge>
                {job.location && <Badge color="secondary">{job.location}</Badge>}
              </div>
              <div className="text-sm muted">{formatSalary(job.salary_min, job.salary_max)}</div>
              <div className="flex gap-2 flex-wrap" style={{ alignItems: 'center' }}>
                <span className="badge badge-info">
                  <SendIcon size={12} style={{ marginRight: 4 }} /> {job.application_count || 0} applications
                </span>
              </div>
              <div className="divider" style={{ margin: '8px 0' }} />
              <div className="flex flex-wrap gap-1">
                <Link to={`/recruiter/applicants?job=${job.id}`} className="btn btn-sm btn-secondary">
                  <SendIcon size={14} /> View Applicants
                </Link>
                <button className="btn btn-sm btn-outline" onClick={() => setEditingJob(job)}>
                  <EditIcon size={14} /> Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(job)}>
                  <TrashIcon size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editingJob} onClose={() => setEditingJob(null)} title="Edit Job" size="lg">
        {editingJob && (
          <JobForm initial={editingJob} onSuccess={handleSave} submitLabel="Save Changes" />
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Job" size="sm">
        <p>Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.</p>
        <div className="flex gap-2 mt-3" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Job'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
