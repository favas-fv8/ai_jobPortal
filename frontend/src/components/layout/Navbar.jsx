import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Logo from '../ui/Logo'
import { SunIcon, MoonIcon, LogoutIcon, UserIcon, DashboardIcon } from '../Icons'

export default function Navbar() {
  const { user, logout, user: ctx } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const getDashboardPath = () => {
    if (!ctx) return '/'
    if (ctx.role === 'admin' || ctx.is_superuser) return '/admin'
    if (ctx.role === 'recruiter') return '/recruiter'
    return '/seeker'
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/">
          <Logo />
        </Link>
        <div className="nav-links" style={{ gap: 8 }}>
          {!ctx ? (
            <>
              <Link className="btn btn-ghost" to="/login" style={{ background: 'none', color: 'var(--text)', border: 'none' }}>
                Login
              </Link>
              <Link className="btn btn-primary" to="/register">
                Get Started
              </Link>
            </>
          ) : (
            <>
              <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
                {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
              </button>
              <Link to={getDashboardPath()} className="btn btn-outline btn-sm">
                <DashboardIcon size={16} /> Dashboard
              </Link>
              <Link to="/profile" title="Manage your profile" className="flex gap-1" style={{ alignItems: 'center', marginLeft: 4 }}>
                <span className="avatar">
                  {(ctx.first_name || ctx.username || '?').charAt(0).toUpperCase()}
                </span>
                <span className="text-sm bold" style={{ display: 'none', marginLeft: 0 }}>
                  {ctx.first_name || ctx.username}
                </span>
              </Link>
              <button className="icon-btn" onClick={handleLogout} aria-label="Logout">
                <LogoutIcon size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
