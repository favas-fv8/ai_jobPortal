import { useEffect, useState, useCallback } from 'react'
import { jobsApi } from '../../api/jobs'
import { resumesApi } from '../../api/resumes'
import { applicationsApi } from '../../api/applications'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import {
  SearchIcon, BriefcaseIcon, SendIcon, EyeIcon, UploadIcon,
} from '../../components/Icons'
import {
  formatDate, formatSalary, jobTypeLabel, experienceLevelLabel, getApiError,
} from '../../utils/helpers'

export default function SeekerJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [jobType, setJobType] = useState('')
  const [viewTarget, setViewTarget] = useState(null)
  const [applyTarget, setApplyTarget] = useState(null)
  const [resumes, setResumes] = useState([])
  const [selectedResume, setSelectedResume] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [applying, setApplying] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const fetchResumes = useCallback(() => {
    return resumesApi.list().then((res) => {
      const data = res.data.results || res.data
      setResumes(data)
      return data
    }).catch(() => [])
  }, [])

  const fetchJobs = useCallback(() => {
    setLoading(true)
    setError('')
    const params = {}
    if (search) params.search = search
    if (jobType) params.job_type = jobType
    jobsApi
      .list(params)
      .then((res) => setJobs(res.data.results || res.data))
      .catch(() => setError('Failed to load jobs.'))
      .finally(() => setLoading(false))
  }, [search, jobType])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const openApply = (job) => {
    setApplyTarget(job)
    setSelectedResume('')
    setCoverLetter('')
    setUploadError('')
    fetchResumes()
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingResume(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await resumesApi.upload(formData)
      const data = await fetchResumes()
      setSelectedResume(res.data.id)
      // If no resume was selected and the uploaded one is primary, use it
      if (!res.data.id && data.length) setSelectedResume(data[0].id)
    } catch (err) {
      setUploadError(getApiError(err, 'Failed to upload resume. Please check file type and size (max 10MB, PDF/DOCX/TXT).'))
    } finally {
      setUploadingResume(false)
      e.target.value = ''
    }
  }

  const handleApply = async () => {
    if (!selectedResume) {
      alert('Please select a resume to apply with.')
      return
    }
    setApplying(true)
    try {
      await applicationsApi.create({
        job: applyTarget.id,
        resume: selectedResume,
        cover_letter: coverLetter,
      })
      alert('Application submitted successfully.')
      setApplyTarget(null)
    } catch (err) {
      alert(getApiError(err, 'Failed to submit application.'))
    } finally {
      setApplying(false)
    }
  }

  if (loading && jobs.length === 0) return <LoadingState message="Loading jobs..." />
  if (error && jobs.length === 0) return <ErrorState message={error} onRetry={fetchJobs} />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Browse Jobs</h1>
          <p className="page-subtitle">Find your next opportunity</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="input-icon-wrap" style={{ flex: 1, minWidth: 200 }}>
          <SearchIcon size={16} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by title, company, or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={jobType}
          onChange={(e) => setJobType(e.target.value)}>
          <option value="">All job types</option>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>
      </div>

      {jobs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BriefcaseIcon}
            title="No jobs found"
            description="Try adjusting your search or check back later for new opportunities."
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
                <div className="flex gap-1 flex-wrap" style={{ justifyContent: 'flex-end' }}>
                  {job.skills_required?.slice(0, 3).map((s, i) => (
                    <span key={i} className="skill-chip neutral">{s}</span>
                  ))}
                  {job.skills_required?.length > 3 && (
                    <span className="skill-chip neutral">+{job.skills_required.length - 3}</span>
                  )}
                </div>
              </div>
              <div className="job-meta">
                <Badge color="secondary">{jobTypeLabel[job.job_type] || job.job_type}</Badge>
                <Badge color="secondary">{experienceLevelLabel[job.experience_level] || job.experience_level}</Badge>
                {job.location && <Badge color="secondary">{job.location}</Badge>}
                <Badge color="success">Open</Badge>
              </div>
              <p className="text-sm muted" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {job.description}
              </p>
              <div className="text-sm muted">{formatSalary(job.salary_min, job.salary_max)}</div>
              <div className="divider" style={{ margin: '8px 0' }} />
              <div className="flex-between">
                <span className="text-xs muted">Posted {formatDate(job.created_at)}</span>
                <div className="flex gap-1">
                  <button className="btn btn-sm btn-outline" onClick={() => setViewTarget(job)}>
                    <EyeIcon size={14} /> View
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => openApply(job)}>
                    <SendIcon size={14} /> Apply Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Job Details modal */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.title}
        size="lg"
      >
        {viewTarget && (
          <div>
            <div className="flex-between mb-2 flex-wrap gap-2">
              <div>
                <div className="job-company text-lg bold">{viewTarget.company}</div>
                {viewTarget.location && <div className="text-sm muted">{viewTarget.location}</div>}
              </div>
              <Badge color="success">Open</Badge>
            </div>
            <div className="job-meta mb-3">
              <Badge color="secondary">{jobTypeLabel[viewTarget.job_type] || viewTarget.job_type}</Badge>
              <Badge color="secondary">{experienceLevelLabel[viewTarget.experience_level] || viewTarget.experience_level}</Badge>
              <Badge color="primary">{formatSalary(viewTarget.salary_min, viewTarget.salary_max)}</Badge>
            </div>

            <div className="mb-3">
              <div className="text-sm bold mb-1">Description</div>
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{viewTarget.description || 'No description provided.'}</p>
            </div>

            {viewTarget.requirements?.length > 0 && (
              <div className="mb-3">
                <div className="text-sm bold mb-1">Requirements</div>
                <ul className="text-sm" style={{ marginLeft: 18 }}>
                  {viewTarget.requirements.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {viewTarget.responsibilities?.length > 0 && (
              <div className="mb-3">
                <div className="text-sm bold mb-1">Responsibilities</div>
                <ul className="text-sm" style={{ marginLeft: 18 }}>
                  {viewTarget.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {viewTarget.skills_required?.length > 0 && (
              <div className="mb-3">
                <div className="text-sm bold mb-1">Skills Required</div>
                <div className="skills-list">
                  {viewTarget.skills_required.map((s, i) => (
                    <span key={i} className="skill-chip neutral">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs muted">Posted {formatDate(viewTarget.created_at)}</p>
            <div className="flex gap-2 mt-3" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewTarget(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { openApply(viewTarget); setViewTarget(null) }}>
                <SendIcon size={15} /> Apply Now
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply modal */}
      <Modal open={!!applyTarget} onClose={() => setApplyTarget(null)} title={`Apply for ${applyTarget?.title}`}>
        <p className="text-sm muted mb-3">{applyTarget?.company} • {applyTarget?.location || 'Remote'}</p>

        <div className="form-group">
          <label className="form-label">Select a Resume</label>
          {resumes.length === 0 ? (
            <p className="text-sm muted mb-2">You don't have any resumes yet. Upload one below or on your resume page.</p>
          ) : (
            <select className="form-control" value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}>
              <option value="">Select a resume...</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.file_name} {r.is_analyzed ? '(analyzed)' : '(not analyzed)'} {r.is_primary ? '(primary)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="divider" style={{ margin: '4px 0 16px' }} />

        <div className="form-group">
          <label className="form-label">Or Upload a New Resume</label>
          <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>
            {uploadingResume ? <span className="spinner" /> : <UploadIcon size={15} />}
            {uploadingResume ? 'Uploading...' : 'Upload from system'}
            <input type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={handleResumeUpload} disabled={uploadingResume} />
          </label>
          <div className="form-hint">Supported formats: PDF, DOCX, TXT (max 10MB). The uploaded resume will be selected automatically.</div>
          {uploadError && <div className="form-error">{uploadError}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Cover Letter (optional)</label>
          <textarea className="form-control" placeholder="Briefly tell the recruiter why you're a good fit..."
            value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
        </div>

        <div className="flex gap-2 mt-3" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setApplyTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={applying || !selectedResume || uploadingResume}>
            {applying && <span className="spinner" />}
            {applying ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </Modal>
    </div>
  )
}