import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="auth-container">
      <div className="text-center">
        <h1 style={{ fontSize: 72, fontWeight: 800, color: 'var(--primary)' }}>404</h1>
        <h2 className="mt-2 mb-2">Page not found</h2>
        <p className="muted mb-4">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  )
}
