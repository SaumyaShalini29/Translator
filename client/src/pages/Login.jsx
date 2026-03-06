import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const floatingWords = ['Hello', 'नमस्ते', 'Hola', 'Bonjour', '你好', 'こんにちは', 'مرحبا', 'Ciao', '안녕하세요']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const data = await login(email, password)
    setLoading(false)
    if (data.success) navigate('/dashboard')
    else setError(data.message || 'Login failed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {floatingWords.map((word, idx) => (
          <span
            key={word}
            className="absolute text-indigo-300/20 text-3xl md:text-5xl font-bold tracking-wide floating-lang"
            style={{
              top: `${8 + (idx % 5) * 18}%`,
              left: `${6 + (idx % 4) * 22}%`,
              animationDuration: `${4 + (idx % 4)}s`,
              animationDelay: `${idx * 0.35}s`,
            }}
          >
            {word}
          </span>
        ))}
      </div>
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-slate-50 mb-2">Login</h1>
        <p className="text-slate-400 mb-6">Welcome back to Polyglot AI Translator</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
