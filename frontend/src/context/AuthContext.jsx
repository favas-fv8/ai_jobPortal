import { createContext, useState, useContext, useEffect } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi
        .getProfile()
        .then((res) => {
          setUser(res.data)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => {
          setLoading(false)
          setInitialized(true)
        })
    } else {
      setLoading(false)
      setInitialized(true)
    }
  }, [])

  const login = async (username, password) => {
    const res = await authApi.login(username, password)
    localStorage.setItem('access_token', res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    const profile = await authApi.getProfile()
    setUser(profile.data)
    return profile.data
  }

  const register = async (data) => {
    const res = await authApi.register(data)
    localStorage.setItem('access_token', res.data.tokens.access)
    localStorage.setItem('refresh_token', res.data.tokens.refresh)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const updateUser = (data) => {
    setUser(data)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        initialized,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
