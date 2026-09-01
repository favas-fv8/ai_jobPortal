import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingState from '../ui/LoadingState'

export default function RequireAuth({ children, roles }) {
  const { user, initialized } = useAuth()
  const location = useLocation()

  if (!initialized || (initialized && user === null && localStorage.getItem('access_token'))) {
    return <LoadingState message="Checking your session..." />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles) {
    const userRole = user.role === 'admin' && !user.is_superuser ? 'admin' : user.role
    const hasRole = roles.includes(userRole) || (user.is_superuser && roles.includes('admin'))
    if (!hasRole) {
      // redirect to appropriate dashboard
      const redirect =
        user.role === 'recruiter' ? '/recruiter' : user.role === 'admin' || user.is_superuser ? '/admin' : '/seeker'
      return <Navigate to={redirect} replace />
    }
  }

  return children
}
