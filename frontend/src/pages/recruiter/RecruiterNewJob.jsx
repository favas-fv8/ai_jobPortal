import { useNavigate } from 'react-router-dom'
import JobForm from '../../components/JobForm'
import { SparklesIcon } from '../../components/Icons'

export default function RecruiterNewJob() {
  const navigate = useNavigate()

  const handleSuccess = (job) => {
    navigate(`/recruiter/applicants?job=${job.id}`)
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title flex gap-2" style={{ alignItems: 'center' }}>
            <SparklesIcon size={24} color="var(--primary)" /> Post a New Job
          </h1>
          <p className="page-subtitle">
            Fill in the details. Our AI automatically extracts key skills and requirements.
          </p>
        </div>
      </div>
      <JobForm onSuccess={handleSuccess} />
    </div>
  )
}
