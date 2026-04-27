import { useState, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token') ?? ''

  const [email, setEmail]       = useState('')
  const [newPw, setNewPw]       = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  // Step 1: request reset (no token in URL)
  const handleForgot = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true); setError('')
    try {
      await axios.post('/auth/forgot-password', { email })
      setSuccess('If that email is registered, a reset link has been sent. Check your inbox.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  // Step 2: set new password (token in URL)
  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    if (newPw.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true); setError('')
    try {
      await axios.post('/auth/reset-password', { token, new_password: newPw })
      setSuccess('Password updated! Redirecting to login…')
      setTimeout(() => navigate('/login', { state: { message: 'Password reset successfully. Please sign in.' } }), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Invalid or expired reset link.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">PredictIQ</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {token ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="text-gray-500 text-sm">
            {token ? 'Enter your new password below.' : "Enter your email and we'll send a reset link."}
          </p>
        </div>

        <div className="card shadow-md">
          {success && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 animate-slide-up">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 animate-slide-up">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {!token ? (
            <form onSubmit={handleForgot} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="your@email.com" autoFocus />
              </div>
              <button type="submit" disabled={loading || !!success} className="btn btn-primary w-full py-3 font-semibold disabled:opacity-50">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</> : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                    className="input pl-9 pr-10" placeholder="At least 8 characters" autoFocus />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading || !!success} className="btn btn-primary w-full py-3 font-semibold disabled:opacity-50">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</> : 'Set New Password'}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-gray-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
