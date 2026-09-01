import { useEffect, useState, useCallback } from 'react'
import { resumesApi } from '../../api/resumes'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import SkillList from '../../components/ui/SkillList'
import {
  UploadIcon, FileIcon, SparklesIcon, TrashIcon, CheckIcon, DownloadIcon, ClockIcon,
} from '../../components/Icons'
import { formatDateTime, getApiError } from '../../utils/helpers'

export default function SeekerResume() {
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [selected, setSelected] = useState(null)

  const fetchResumes = useCallback(() => {
    setLoading(true)
    resumesApi
      .list()
      .then((res) => setResumes(res.data.results || res.data))
      .catch(() => setError('Failed to load your resumes.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchResumes() }, [fetchResumes])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      await resumesApi.upload(formData)
      fetchResumes()
      alert('Resume uploaded successfully. You can now analyze it with AI.')
    } catch (err) {
      setError(getApiError(err, 'Failed to upload resume. Please check file type and size (max 10MB, PDF/DOCX/TXT).'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleAnalyze = async (id) => {
    setAnalyzingId(id)
    setError('')
    try {
      await resumesApi.analyze(id)
      fetchResumes()
      alert('Resume analysis completed successfully!')
    } catch (err) {
      setError(getApiError(err, 'Resume analysis failed. Check that GEMINI_API_KEY is configured on the server.'))
    } finally {
      setAnalyzingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume?')) return
    try {
      await resumesApi.delete(id)
      fetchResumes()
    } catch (err) {
      setError(getApiError(err, 'Failed to delete resume.'))
    }
  }

  const handleSetPrimary = async (id) => {
    try {
      await resumesApi.setPrimary(id)
      fetchResumes()
    } catch (err) {
      setError(getApiError(err, 'Failed to set resume as primary.'))
    }
  }

  const statusBadge = (status) => {
    if (status === 'completed') return <Badge color="success">Analyzed</Badge>
    if (status === 'processing' || status === 'pending') return <Badge color="warning">{status}</Badge>
    if (status === 'failed') return <Badge color="danger">Failed</Badge>
    return <Badge color="secondary">{status}</Badge>
  }

  if (loading) return <LoadingState message="Loading your resumes..." />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">My Resume</h1>
          <p className="page-subtitle">Upload and analyze your resume with AI to unlock smart matching</p>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      <div className="card card-padded mb-4">
        <h3 className="card-title mb-2 flex gap-2" style={{ alignItems: 'center' }}>
          <UploadIcon size={18} color="var(--primary)" /> Upload a Resume
        </h3>
        <p className="text-sm muted mb-3">
          Supported formats: PDF, DOCX, TXT. Maximum file size: 10MB.
        </p>
        <label className={`btn btn-primary ${uploading ? 'disabled' : ''}`} style={{ display: 'inline-flex' }}>
          {uploading ? <span className="spinner" /> : <UploadIcon size={16} />}
          {uploading ? 'Uploading...' : 'Choose File & Upload'}
          <input type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {resumes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileIcon}
            title="No resumes yet"
            description="Upload your resume above, then run AI analysis to extract your skills, education, and experience."
          />
        </div>
      ) : (
        <div className="grid">
          {resumes.map((r) => (
            <div key={r.id} className="card card-padded job-card">
              <div className="job-card-top">
                <div className="flex gap-2" style={{ alignItems: 'center' }}>
                  <div className="feature-icon primary"><FileIcon size={22} /></div>
                  <div>
                    <h3 className="job-title" style={{ fontSize: 15 }}>{r.file_name}</h3>
                    <div className="text-xs muted">{formatDateTime(r.created_at)} • {(r.file_size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <div className="flex gap-1" style={{ alignItems: 'center' }}>
                  {r.is_primary && <Badge color="info">Primary</Badge>}
                  {statusBadge(r.analysis_status)}
                </div>
              </div>

              {r.is_analyzed && (
                <>
                  <div className="mt-2">
                    <div className="text-xs muted mb-1">Extracted by AI</div>
                    {r.full_name && <div className="bold text-sm">{r.full_name}</div>}
                    {(r.email || r.phone) && <div className="text-xs muted">{r.email} {r.phone}</div>}
                  </div>
                  <div className="mt-2">
                    <div className="text-sm bold mb-1">Skills ({r.skills?.length || 0})</div>
                    <SkillList skills={r.skills} type="neutral" />
                  </div>
                  {r.education?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm bold mb-1">Education</div>
                      <ul className="text-sm muted" style={{ marginLeft: 18 }}>
                        {r.education.map((ed, i) => (
                          <li key={i}>{ed.degree} - {ed.institution} {ed.years}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              <div className="divider" style={{ margin: '8px 0' }} />
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-sm btn-primary" onClick={() => setSelected(r)}>
                  <SparklesIcon size={14} /> {r.is_analyzed ? 'View Analysis' : 'Analyze with AI'}
                </button>
                {!r.is_analyzed && (
                  <button className="btn btn-sm btn-secondary" onClick={() => handleAnalyze(r.id)} disabled={analyzingId === r.id}>
                    {analyzingId === r.id && <span className="spinner" />}
                    {analyzingId === r.id ? 'Analyzing...' : 'Run AI Analysis'}
                  </button>
                )}
                {!r.is_primary && (
                  <button className="btn btn-sm btn-outline" onClick={() => handleSetPrimary(r.id)} disabled={analyzingId === r.id}>
                    <CheckIcon size={14} /> Set as Primary
                  </button>
                )}
                {r.file && (
                  <button className="btn btn-sm btn-outline" onClick={() => window.open(r.file, '_blank')}>
                    <DownloadIcon size={14} /> Download
                  </button>
                )}
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>
                  <TrashIcon size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Resume AI Analysis" size="lg">
        {selected && (
          <div>
            <div className="grid grid-3 mb-3">
              <div className="form-group">
                <div className="text-xs muted mb-1">Full Name</div>
                <div className="text-sm bold">{selected.full_name || '-'}</div>
              </div>
              <div className="form-group">
                <div className="text-xs muted mb-1">Email</div>
                <div className="text-sm">{selected.email || '-'}</div>
              </div>
              <div className="form-group">
                <div className="text-xs muted mb-1">Phone</div>
                <div className="text-sm">{selected.phone || '-'}</div>
              </div>
            </div>

            {selected.summary && (
              <div className="mb-3">
                <div className="text-sm bold mb-1">Summary</div>
                <p className="text-sm muted">{selected.summary}</p>
              </div>
            )}

            <div className="mb-3">
              <div className="text-sm bold mb-2">Skills ({selected.skills?.length || 0})</div>
              <SkillList skills={selected.skills} type="neutral" />
            </div>

            <div className="mb-3">
              <div className="text-sm bold mb-2">Education</div>
              {selected.education?.length ? (
                <div className="flex-column">
                  {selected.education.map((ed, i) => (
                    <div key={i} className="gap-row">
                      <div>
                        <div className="text-sm bold">{ed.degree || 'Degree'}</div>
                        <div className="text-xs muted">{ed.institution}{ed.years ? ` • ${ed.years}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <span className="text-xs muted">No education found</span>}
            </div>

            <div className="mb-3">
              <div className="text-sm bold mb-2">Work Experience</div>
              {selected.experience?.length ? (
                <div className="flex-column">
                  {selected.experience.map((exp, i) => (
                    <div key={i} className="gap-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div><span className="bold text-sm">{exp.title}</span> <span className="muted">- {exp.company}</span></div>
                      {exp.duration && <div className="text-xs muted">{exp.duration}</div>}
                      {exp.description && <div className="text-sm muted mt-1">{exp.description}</div>}
                    </div>
                  ))}
                </div>
              ) : <span className="text-xs muted">No experience found</span>}
            </div>

            {selected.certifications?.length > 0 && (
              <div>
                <div className="text-sm bold mb-2">Certifications</div>
                <SkillList skills={selected.certifications} type="neutral" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
