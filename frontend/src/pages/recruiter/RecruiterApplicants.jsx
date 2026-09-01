import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { matchingApi } from '../../api/matching'
import { applicationsApi } from '../../api/applications'
import { jobsApi } from '../../api/jobs'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import MatchScore from '../../components/ui/MatchScore'
import Modal from '../../components/ui/Modal'
import {
  UsersIcon, SparklesIcon, FilterIcon, CheckIcon, XIcon, DownloadIcon, BriefcaseIcon,
} from '../../components/Icons'
import { formatDateTime, applicationStatusLabel, getApiError } from '../../utils/helpers'

const statusOptions = ['submitted', 'under_review', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']

export default function RecruiterApplicants() {
  const [searchParams] = useSearchParams()
  const [applicants, setApplicants] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  const [filters, setFilters] = useState({
    job: searchParams.get('job') || '',
    status: '',
    minScore: '',
    showAnalyzedOnly: false,
  })
  const [order, setOrder] = useState('-match_score')

  const fetchJobs = useCallback(() => {
    jobsApi.list().then((res) => setJobs(res.data.results || res.data)).catch(() => {})
  }, [])

  const fetchApplicants = useCallback(() => {
    setLoading(true)
    setError('')
    const params = { ordering: order }
    if (filters.job) params.job = filters.job
    if (filters.status) params.status = filters.status
    if (filters.minScore) params.min_score = filters.minScore
    matchingApi
      .applicants(params)
      .then((res) => {
        let data = res.data
        if (filters.showAnalyzedOnly) data = data.filter((a) => a.is_ai_analyzed)
        setApplicants(data)
      })
      .catch((err) => setError(getApiError(err, 'Failed to load applicants.')))
      .finally(() => setLoading(false))
  }, [filters, order])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    fetchApplicants()
  }, [fetchApplicants])

  const handleAnalyze = async (id) => {
    setAnalyzing(true)
    try {
      const res = await applicationsApi.analyzeWithAi(id)
      setApplicants((prev) =>
        prev.map((a) =>
          a.application_id === id
            ? {
                ...a,
                match_score: res.data.match_score,
                matched_skills: res.data.matched_skills,
                missing_skills: res.data.missing_skills,
                is_ai_analyzed: true,
              }
            : a
        )
      )
      if (selected && selected.application_id === id) setSelected(res.data)
    } catch (err) {
      alert(getApiError(err, 'AI analysis failed.'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await applicationsApi.updateStatus(id, { status: newStatus })
      setApplicants((prev) => prev.map((a) => (a.application_id === id ? { ...a, status: newStatus } : a)))
      if (selected && selected.application_id === id) setSelected({ ...selected, status: newStatus })
    } catch (err) {
      alert(getApiError(err, 'Failed to update status.'))
    }
  }

  const resumeUrl = selected?.resume
    ? `/media/${selected.resume_file || ''}`
    : ''

  if (loading && applicants.length === 0) return <LoadingState message="Loading applicants..." />
  if (error && applicants.length === 0) return <ErrorState message={error} onRetry={fetchApplicants} />

  const avgScore = applicants.length
    ? Math.round(applicants.filter((a) => a.match_score != null).reduce((s, a) => s + a.match_score, 0) / applicants.filter((a) => a.match_score != null).length) || 0
    : 0

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">AI Applicant Screening</h1>
          <p className="page-subtitle">
            Review candidates with AI match scores. {applicants.filter((a) => a.match_score != null).length} analyzed
            {applicants.length > 0 && ` | Avg score ${avgScore}%`}
          </p>
        </div>
        <span className="badge badge-primary" style={{ fontSize: 13 }}>
          <SparklesIcon size={14} /> AI Assisted Screening
        </span>
      </div>

      <div className="filter-bar">
        <FilterIcon size={18} color="var(--muted, var(--text-muted))" />
        <select className="form-control" style={{ width: 'auto' }} value={filters.job}
          onChange={(e) => setFilters({ ...filters, job: e.target.value })}>
          <option value="">All jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select className="form-control" style={{ width: 'auto' }} value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{applicationStatusLabel[s]}</option>)}
        </select>
        <input type="number" className="form-control" style={{ width: 130 }} placeholder="Min match %"
          value={filters.minScore} onChange={(e) => setFilters({ ...filters, minScore: e.target.value })} />
        <select className="form-control" style={{ width: 'auto' }} value={order}
          onChange={(e) => setOrder(e.target.value)}>
          <option value="-match_score">Sort: Highest match</option>
          <option value="match_score">Sort: Lowest match</option>
          <option value="-created_at">Sort: Newest</option>
        </select>
        <label className="flex gap-1" style={{ alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.showAnalyzedOnly}
            onChange={(e) => setFilters({ ...filters, showAnalyzedOnly: e.target.checked })} />
          <span className="text-sm">AI analyzed only</span>
        </label>
      </div>

      {applicants.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={UsersIcon}
            title="No applicants found"
            description="No applications match your current filters. Adjust the filters or wait for new applications."
          />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Match Score</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.application_id} onClick={() => setSelected(a)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <span className="avatar">{(a.applicant_name || a.applicant_email || '?').charAt(0).toUpperCase()}</span>
                        <div>
                          <div className="bold text-sm">{a.applicant_name}</div>
                          <div className="text-xs muted">{a.applicant_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{a.job_title}</td>
                    <td>
                      {a.is_ai_analyzed ? (
                        <MatchScore score={a.match_score} showLabel={false} />
                      ) : (
                        <span className="badge badge-secondary">Not analyzed</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                        value={a.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(a.application_id, e.target.value)}
                      >
                        {statusOptions.map((s) => <option key={s} value={s}>{applicationStatusLabel[s]}</option>)}
                      </select>
                    </td>
                    <td className="text-sm muted">{formatDateTime(a.applied_at)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(a)
                        }}
                      >
                        <SparklesIcon size={13} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Candidate Review" size="lg">
        {selected && (
          <div>
            <div className="grid grid-3 mb-3">
              <div className="card card-padded" style={{ textAlign: 'center' }}>
                <div className="muted text-sm mb-1">AI Match Score</div>
                <div className="match-score" style={{ color: selected.match_score >= 70 ? 'var(--success)' : selected.match_score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                  {selected.match_score != null ? `${Math.round(selected.match_score)}%` : 'N/A'}
                </div>
              </div>
              <div className="card card-padded">
                <div className="muted text-sm mb-1">Match</div>
                <div className="flex gap-2"><CheckIcon size={16} color="var(--success)" /><span className="bold">{selected.matched_skills?.length || 0}</span></div>
              </div>
              <div className="card card-padded">
                <div className="muted text-sm mb-1">Missing Skills</div>
                <div className="flex gap-2"><XIcon size={16} color="var(--danger)" /><span className="bold">{selected.missing_skills?.length || 0}</span></div>
              </div>
            </div>

            {!selected.is_ai_analyzed && (
              <div className="alert alert-info mb-3">
                This candidate has not been analyzed by AI yet. Run analysis to see their match score.
              </div>
            )}

            <div className="mb-3">
              <div className="text-sm bold mb-2">Matched Skills</div>
              {selected.matched_skills?.length ? (
                <div className="skills-list">
                  {selected.matched_skills.map((s, i) => <span key={i} className="skill-chip matched"><CheckIcon size={11} style={{ marginRight: 4 }} />{s}</span>)}
                </div>
              ) : <span className="text-xs muted">No matches yet. Run AI analysis.</span>}
            </div>

            <div className="mb-3">
              <div className="text-sm bold mb-2">Missing / Skill Gap</div>
              {selected.missing_skills?.length ? (
                <div className="skills-list">
                  {selected.missing_skills.map((s, i) => <span key={i} className="skill-chip missing"><XIcon size={11} style={{ marginRight: 4 }} />{s}</span>)}
                </div>
              ) : <span className="text-xs muted">No gaps identified yet.</span>}
            </div>

            <div className="flex gap-2 flex-wrap" style={{ alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleAnalyze(selected.application_id)}
                disabled={analyzing}
              >
                {analyzing ? <span className="spinner" /> : <SparklesIcon size={15} />}
                {analyzing ? 'Analyzing...' : selected.is_ai_analyzed ? 'Re-analyze with AI' : 'Analyze with AI'}
              </button>
              <button className="btn btn-secondary" onClick={() => window.open(`/media/${selected.resume_file || ''}`, '_blank')}>
                <DownloadIcon size={15} /> Resume
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
