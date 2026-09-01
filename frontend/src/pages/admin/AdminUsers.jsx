import { useEffect, useState, useCallback } from 'react'
import { usersApi } from '../../api/users'
import LoadingState from '../../components/ui/LoadingState'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import {
  UsersIcon, SearchIcon, UserIcon,
} from '../../components/Icons'
import { formatDate, roleBadgeColor, getApiError } from '../../utils/helpers'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})

  const fetchUsers = useCallback(() => {
    setLoading(true)
    usersApi
      .list()
      .then((res) => setUsers(res.data.results || res.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleToggleActive = async (user) => {
    try {
      const res = await usersApi.toggleActive(user.id)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: res.data.is_active } : u)))
    } catch (err) {
      alert(getApiError(err, 'Failed to update user status.'))
    }
  }

  const openEdit = (user) => {
    setEditing(user)
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      company: user.company,
      role: user.role,
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await usersApi.update(editing.id, editForm)
      fetchUsers()
      setEditing(null)
      alert('User updated.')
    } catch (err) {
      alert(getApiError(err, 'Failed to update user.'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !roleFilter || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) return <LoadingState message="Loading users..." />
  if (error) return <ErrorState message={error} onRetry={fetchUsers} />

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage all users across the platform</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="input-icon-wrap" style={{ flex: 1, minWidth: 200 }}>
          <SearchIcon size={16} />
          <input type="text" className="form-control" placeholder="Search by username or email..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 'auto' }} value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="jobseeker">Job Seeker</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={UsersIcon} title="No users found" description="No users match your current filters." />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <span className="avatar">{(u.username || '?').charAt(0).toUpperCase()}</span>
                        <div>
                          <div className="bold text-sm">{u.username}</div>
                          <div className="text-xs muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge color={roleBadgeColor[u.role]}>{u.role}</Badge></td>
                    <td className="text-sm">{u.company || '-'}</td>
                    <td className="text-sm muted">{formatDate(u.date_joined)}</td>
                    <td><Badge color={u.is_active ? 'success' : 'secondary'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>
                          <UserIcon size={14} /> Edit
                        </button>
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-success'}`}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit User: ${editing?.username}`}>
        <form onSubmit={handleEditSubmit}>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-control" value={editForm.first_name || ''}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-control" value={editForm.last_name || ''}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={editForm.email || ''}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" value={editForm.phone_number || ''}
              onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input className="form-control" value={editForm.company || ''}
              onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={editForm.role || ''}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="jobseeker">Job Seeker</option>
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
