import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || '/api'

const parseResponse = async (res) => {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }

  const text = await res.text()
  return {
    success: false,
    message: text || `Request failed with status ${res.status}`,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(parseResponse)
        .then((data) => {
          if (data.success) setUser(data.user)
          else logout()
        })
        .catch(() => logout())
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await parseResponse(res)
      if (data.success) {
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem('token', data.token)
      }
      return data
    } catch {
      return {
        success: false,
        message: 'Unable to reach server. Please check backend is running and try again.',
      }
    }
  }

  const signup = async (name, email, password) => {
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await parseResponse(res)
      if (data.success) {
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem('token', data.token)
      }
      return data
    } catch {
      return {
        success: false,
        message: 'Unable to reach server. Please check backend is running and try again.',
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
