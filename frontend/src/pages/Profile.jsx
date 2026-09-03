import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/auth'
import LoadingState from '../components/ui/LoadingState'
import Badge from '../components/ui/Badge'
import {
  UserIcon, MailIcon, PhoneIcon, BriefcaseIcon, UploadIcon, AlertIcon,
} from '../components/Icons'
import { formatDate, getApiError } from '../utils/helpers'

const roleLabel = { admin: 'Admin', recruiter: 'Recruiter', jobseeker: 'Job Seeker' }

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    company: '',
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(t)
  }, [success])

  useEffect(() => {
    authApi
      .getProfile()
      .then((res) => {
        setProfile(res.data)
        setForm({
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          email: res.data.email || '',
          phone_number: res.data.phone_number || '',
          company: res.data.company || '',
        })
      })
      .catch((err) => setError(getApiError(err, 'Failed to load profile.')))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const errors = {}
    if (!form.first_name) errors.first_name = 'First name is required'
    else if (!/^[A-Za-z\s'-]+$/.test(form.first_name)) errors.first_name = 'First name must contain only letters'
    if (!form.last_name) errors.last_name = 'Last name is required'
    else if (!/^[A-Za-z\s'-]+$/.test(form.last_name)) errors.last_name = 'Last name must contain only letters'
    if (!form.email) errors.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address'
    if (form.phone_number && !/^\d{10}$/.test(form.phone_number)) errors.phone_number = 'Phone number must be exactly 10 digits'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined) data.append(k, v)
    })
    if (photo) data.append('profile_photo', photo)

    setSaving(true)
    try {
      const res = await authApi.updateProfile(data)
      setProfile(res.data)
      setForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        email: res.data.email || '',
        phone_number: res.data.phone_number || '',
        company: res.data.company || '',
      })
      setPhoto(null)
      setPhotoPreview('')
      updateUser(res.data)
      setSuccess('Profile updated successfully.')
    } catch (err) {
      const dataErr = err?.response?.data || {}
      const fieldErr = {}
      Object.entries(dataErr).forEach(([k, v]) => {
        if (k !== 'detail' && k !== 'non_field_errors') {
          fieldErr[k] = Array.isArray(v) ? v.join(', ') : v
        }
      })
      if (Object.keys(fieldErr).length > 0) setFieldErrors(fieldErr)
      setError(getApiError(err, 'Failed to update profile.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading your profile..." />

  const photoUrl = photoPreview || profile?.profile_photo

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information and settings</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-3">
          <AlertIcon size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card card-padded mb-4">
          <h3 className="card-title mb-3">Profile Photo</h3>
          <div className="flex gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" width={72} height={72}
                style={{ borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span className="avatar avatar-lg">
                {(profile?.first_name || profile?.username || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>
                <UploadIcon size={15} /> Choose Photo
                <input type="file" accept="image/*" hidden onChange={handlePhoto} />
              </label>
              {photoPreview && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }}
                  onClick={() => { setPhoto(null); setPhotoPreview('') }}>
                  Remove
                </button>
              )}
              <div className="form-hint">JPG, PNG or GIF. Optional.</div>
            </div>
          </div>
        </div>

        <div className="card card-padded mb-4">
          <h3 className="card-title mb-3">Account</h3>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="form-control" value={profile?.username} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <input type="text" className="form-control" value={roleLabel[profile?.role] || profile?.role} disabled />
            </div>
          </div>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Member Since</label>
              <input type="text" className="form-control"
                value={formatDate(profile?.date_joined)} disabled />
            </div>
          </div>
        </div>

        <div className="card card-padded mb-4">
          <h3 className="card-title mb-3">Personal Information</h3>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">First Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <div className="input-icon-wrap">
                <UserIcon size={16} />
                <input type="text" name="first_name" className="form-control" placeholder="First name"
                  value={form.first_name} onChange={handleChange} />
              </div>
              {fieldErrors.first_name && <div className="form-error">{fieldErrors.first_name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span style={{ color: "var(--danger)" }}>*</span></label>
              <input type="text" name="last_name" className="form-control" placeholder="Last name"
                value={form.last_name} onChange={handleChange} />
              {fieldErrors.last_name && <div className="form-error">{fieldErrors.last_name}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className="input-icon-wrap">
              <MailIcon size={16} />
              <input type="email" name="email" className="form-control" placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
            {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div className="input-icon-wrap">
                <PhoneIcon size={16} />
                <input type="tel" name="phone_number" className="form-control" placeholder="+1 555 123 4567"
                  value={form.phone_number} onChange={handleChange} />
              </div>
              {fieldErrors.phone_number && <div className="form-error">{fieldErrors.phone_number}</div>}
            </div>
            {(profile?.role === 'recruiter' || profile?.is_superuser) && (
              <div className="form-group">
                <label className="form-label">Company</label>
                <div className="input-icon-wrap">
                  <BriefcaseIcon size={16} />
                  <input type="text" name="company" className="form-control" placeholder="Company name"
                    value={form.company} onChange={handleChange} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => history.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        {success && (
          <div className="alert alert-success mb-4">
            {success}
          </div>
        )}
      </form>
    </div>
  )
}
