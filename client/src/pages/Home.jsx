import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-3xl p-6">
        <h1 className="text-3xl font-semibold text-slate-50 mb-2">
          Polyglot AI Translator
        </h1>
        <p className="text-slate-400 mb-6">
          Full-stack MERN project · Translation · OCR · AI enhancements · Voice support
        </p>

        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 space-y-2">
          <p className="text-slate-300 font-medium">Section 1 + 2: Base + Auth ready</p>
          <p className="text-sm text-slate-400">
            Frontend + backend · JWT auth · Role-based access
          </p>

          <div className="mt-4 flex gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
