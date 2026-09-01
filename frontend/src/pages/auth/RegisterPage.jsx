import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../components/ui/Logo'
import {
  AlertIcon, LockIcon, UserIcon, MailIcon, BriefcaseIcon, UserIcon as SeekIcon,
} from '../../components/Icons'
import { getApiError } from '../../utils/helpers'

function getDashboardPath(role) {
  if (role === 'recruiter') return '/recruiter'
  if (role === 'admin') return '/admin'
  return '/seeker'
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    company: '',
    role: 'jobseeker',
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const validate = () => {
    const errors = {}
    if (!form.username) errors.username = 'Username is required'
    else if (form.username.length < 3) errors.username = 'Username must be at least 3 characters'
    if (!form.email) errors.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address'
    if (!form.first_name) errors.first_name = 'First name is required'
    if (!form.last_name) errors.last_name = 'Last name is required'
    if (!form.password) errors.password = 'Password is required'
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm_password) errors.confirm_password = 'Passwords do not match'
    if (form.role === 'recruiter' && !form.company) errors.company = 'Company name is required for recruiters'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setLoading(true)
    try {
      const user = await register(form)
      navigate(getDashboardPath(user.role))
    } catch (err) {
      const data = err?.response?.data || {}
      const fieldErr = {}
      Object.entries(data).forEach(([k, v]) => {
        if (k !== 'detail' && k !== 'non_field_errors') {
          fieldErr[k] = Array.isArray(v) ? v.join(', ') : v
        }
      })
      if (Object.keys(fieldErr).length > 0) setFieldErrors(fieldErr)
      setError(getApiError(err, 'Registration failed. Please check your details.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ padding: '32px 24px' }}>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <Logo size={40} />
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join AI-JobPortal and unlock AI-powered recruitment</p>

        {error && (
          <div className="alert alert-error">
            <AlertIcon size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <div className="role-select">
              <button
                type="button"
                className={`role-option ${form.role === 'jobseeker' ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, role: 'jobseeker' })}
              >
                <SeekIcon size={22} />
                <div>
                  <div className="bold">Job Seeker</div>
                  <div className="text-xs muted">Find jobs and AI recommendations</div>
                </div>
              </button>
              <button
                type="button"
                className={`role-option ${form.role === 'recruiter' ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, role: 'recruiter' })}
              >
                <BriefcaseIcon size={22} />
                <div>
                  <div className="bold">Recruiter</div>
                  <div className="text-xs muted">Post jobs and screen candidates</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <div className="input-icon-wrap">
                <UserIcon size={16} />
                <input type="text" name="first_name" className="form-control" placeholder="First name"
                  value={form.first_name} onChange={handleChange} />
              </div>
              {fieldErrors.first_name && <div className="form-error">{fieldErrors.first_name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input type="text" name="last_name" className="form-control" placeholder="Last name"
                value={form.last_name} onChange={handleChange} />
              {fieldErrors.last_name && <div className="form-error">{fieldErrors.last_name}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-icon-wrap">
              <UserIcon size={16} />
              <input type="text" name="username" className="form-control" placeholder="Choose a username"
                value={form.username} onChange={handleChange} autoComplete="username" />
            </div>
            {fieldErrors.username && <div className="form-error">{fieldErrors.username}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-icon-wrap">
              <MailIcon size={16} />
              <input type="email" name="email" className="form-control" placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
            {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
          </div>

          {form.role === 'recruiter' && (
            <div className="form-group">
              <label className="form-label">Company</label>
              <div className="input-icon-wrap">
                <BriefcaseIcon size={16} />
                <input type="text" name="company" className="form-control" placeholder="Company name"
                  value={form.company} onChange={handleChange} />
              </div>
              {fieldErrors.company && <div className="form-error">{fieldErrors.company}</div>}
            </div>
          )}

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrap">
                <LockIcon size={16} />
                <input type="password" name="password" className="form-control" placeholder="Min 8 characters"
                  value={form.password} onChange={handleChange} autoComplete="new-password" />
              </div>
              {fieldErrors.password && <div className="form-error">{fieldErrors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-icon-wrap">
                <LockIcon size={16} />
                <input type="password" name="confirm_password" className="form-control" placeholder="Re-enter password"
                  value={form.confirm_password} onChange={handleChange} autoComplete="new-password" />
              </div>
              {fieldErrors.confirm_password && <div className="form-error">{fieldErrors.confirm_password}</div>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
