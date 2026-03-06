import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const API = import.meta.env.VITE_API_URL || '/api'

export default function History() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API}/history`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
        const data = await res.json()

        if (!data.success) {
          setError(data.message || 'Failed to load history')
          return
        }

        setHistory(data.history || [])
      } catch {
        setError('Unable to load history')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Profile & History</h1>
          <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 h-fit">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Profile</p>
            <p className="mt-4 text-lg font-medium">{user?.name}</p>
            <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
            <p className="text-slate-500 text-sm mt-1">Role: {user?.role}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">Your Conversation History</p>

            {loading && <p className="text-slate-400">Loading history...</p>}
            {error && <p className="text-red-400">{error}</p>}

            {!loading && !error && history.length === 0 && (
              <p className="text-slate-400">No history yet. Start detecting/translating from dashboard.</p>
            )}

            <div className="space-y-3">
              {history.map((item) => (
                <div key={item._id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200">
                      {item.feature}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-400">Input</p>
                  <p className="text-sm text-slate-200">{item.inputText}</p>

                  {item.detectedLanguage && (
                    <p className="text-xs text-slate-400 mt-2">Detected: {item.detectedLanguage}</p>
                  )}

                  {item.targetLanguage && (
                    <p className="text-xs text-slate-400">Target: {item.targetLanguage}</p>
                  )}

                  {item.translatedText && (
                    <>
                      <p className="text-sm text-slate-400 mt-2">Translated</p>
                      <p className="text-sm text-slate-100">{item.translatedText}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
