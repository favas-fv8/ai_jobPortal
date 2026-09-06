import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Navbar from './Navbar'
import {
  DashboardIcon, UsersIcon, BriefcaseIcon, FileIcon, SendIcon,
  LogoutIcon, SparklesIcon, ActivityIcon,
} from '../Icons'

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const currentRole = role || (user?.is_superuser ? 'admin' : user?.role)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navItems = {
    admin: [
      { to: '/admin', label: 'Overview', icon: DashboardIcon, end: true },
      { to: '/admin/users', label: 'Users', icon: UsersIcon },
      { to: '/admin/jobs', label: 'Jobs', icon: BriefcaseIcon },
      { to: '/admin/applications', label: 'Applications', icon: SendIcon },
    ],
    recruiter: [
      { to: '/recruiter', label: 'Overview', icon: DashboardIcon, end: true },
      { to: '/recruiter/jobs', label: 'My Jobs', icon: BriefcaseIcon },
      { to: '/recruiter/new-job', label: 'Post a Job', icon: SparklesIcon },
      { to: '/recruiter/applicants', label: 'Applicants', icon: UsersIcon },
    ],
    jobseeker: [
      { to: '/seeker', label: 'Overview', icon: DashboardIcon, end: true },
      { to: '/seeker/jobs', label: 'Browse Jobs', icon: BriefcaseIcon },
      { to: '/seeker/recommendations', label: 'AI Recommendations', icon: SparklesIcon },
      { to: '/seeker/resume', label: 'My Resume', icon: FileIcon },
      { to: '/seeker/applications', label: 'My Applications', icon: ActivityIcon },
    ],
  }

  const items = navItems[currentRole] || []

  return (
    <>
      <Navbar />
      <div className="app-shell">
        <aside className="sidebar">
          <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 'auto' }}>
          <div className="flex gap-2" style={{ alignItems: 'center', padding: '0 10px', marginBottom: 12 }}>
            <Link to="/profile" title="Manage your profile" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="avatar">
                {(user?.first_name || user?.username || '?').charAt(0).toUpperCase()}
              </span>
            </Link>
            <div style={{ minWidth: 0 }}>
              <Link to="/profile" className="text-sm bold" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.first_name || user?.username}
              </Link>
              <div className="text-xs muted" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <div className="flex gap-1" style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-secondary flex-1" onClick={toggleTheme} style={{ flex: 1 }}>
              {dark ? <>Light</> : <>Dark</>}
            </button>
            <button className="btn btn-sm btn-danger" onClick={handleLogout} style={{ flex: 1 }}>
              <LogoutIcon size={15} /> Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
    </>
  )
}
