import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/ui/Logo'
import {
  SparklesIcon, UsersIcon, BriefcaseIcon, FileIcon, SearchIcon, TrendingUpIcon, TargetIcon,
} from '../components/Icons'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <header className="navbar" style={{ position: 'static' }}>
        <div className="navbar-inner">
          <Link to="/"><Logo /></Link>
          <div className="nav-links" style={{ gap: 10 }}>
            <span className="muted text-sm" style={{ display: 'block' }}>
              The AI-powered job platform
            </span>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container text-center">
          <span className="badge badge-primary" style={{ fontSize: 13, padding: '6px 14px' }}>
            <SparklesIcon size={14} /> AI-Powered Talent Matching
          </span>
          <h1 className="hero-title">
            Connect the right talent<br />with the right opportunities
          </h1>
          <p className="hero-subtitle">
            AI-JobPortal uses intelligent resume analysis and semantic matching to connect
            job seekers with their ideal roles and help recruiters screen candidates with
            data-driven insights.
          </p>
          <div className="flex-center gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Get Started <SearchIcon size={16} />
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      <section className="container features">
        <h2 className="text-center mb-4">Built for everyone in the hiring journey</h2>
        <div className="grid grid-3">
          <div className="card card-padded feature-card">
            <div className="feature-icon primary"><FileIcon size={26} /></div>
            <h3 className="mt-2 mb-1">Smart Resume Analysis</h3>
            <p className="text-sm muted">Upload your resume and let AI extract your skills, education, experience, and certifications instantly.</p>
          </div>
          <div className="card card-padded feature-card">
            <div className="feature-icon success"><TargetIcon size={26} /></div>
            <h3 className="mt-2 mb-1">AI Job Matching</h3>
            <p className="text-sm muted">Get relevant job recommendations with match scores and skill-gap analysis tailored to your profile.</p>
          </div>
          <div className="card card-padded feature-card">
            <div className="feature-icon warning"><UsersIcon size={26} /></div>
            <h3 className="mt-2 mb-1">Recruiter Screening</h3>
            <p className="text-sm muted">Analyze applicants' resumes against job descriptions and rank candidates by AI match quality.</p>
          </div>
        </div>
      </section>

      <section className="container how-it-works">
        <h2 className="text-center mb-4">How it works</h2>
        <div className="grid grid-3">
          <div className="card card-padded text-center">
            <div className="feature-icon primary" style={{ margin: '0 auto' }}><BriefcaseIcon size={24} /></div>
            <h3 className="mt-2 mb-1">1. Create a Job</h3>
            <p className="text-sm muted">Recruiters post jobs and AI extracts key requirements and required skills.</p>
          </div>
          <div className="card card-padded text-center">
            <div className="feature-icon success" style={{ margin: '0 auto' }}><TrendingUpIcon size={24} /></div>
            <h3 className="mt-2 mb-1">2. Candidates Apply</h3>
            <p className="text-sm muted">Job seekers upload resumes and apply with AI-analyzed profiles.</p>
          </div>
          <div className="card card-padded text-center">
            <div className="feature-icon warning" style={{ margin: '0 auto' }}><SparklesIcon size={24} /></div>
            <h3 className="mt-2 mb-1">3. AI Matches</h3>
            <p className="text-sm muted">Our engine compares skills and shows match scores with clear skill gaps.</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="container">
          <p className="text-sm muted text-center">
            AI-JobPortal - Intelligent recruitment, powered by AI
          </p>
        </div>
      </footer>
    </div>
  )
}
