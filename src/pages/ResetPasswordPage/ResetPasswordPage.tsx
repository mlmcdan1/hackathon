import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import './ResetPasswordPage.css'

type Status = 'checking' | 'ready' | 'invalid' | 'success'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setStatus('invalid')
      return
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready')
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === 'checking' ? 'ready' : s))
      else setStatus((s) => (s === 'checking' ? 'invalid' : s))
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (!supabase) return

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setStatus('success')
      setTimeout(() => navigate('/'), 2000)
    }
  }

  return (
    <div className="rp-overlay">
      <div className="rp-dialog" role="dialog" aria-modal="true" aria-label="Reset your password">
        <div className="rp-titlebar">
          <span className="rp-titlebar__text">Reset your password</span>
        </div>

        <div className="rp-body">
          {status === 'checking' && (
            <p className="rp-info">Verifying your reset link...</p>
          )}

          {status === 'invalid' && (
            <>
              <p className="rp-error">This reset link is invalid or has expired.</p>
              <button type="button" className="rp-submit" onClick={() => navigate('/')}>
                Back to home
              </button>
            </>
          )}

          {status === 'success' && (
            <p className="rp-info">Password updated. Redirecting you home...</p>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit}>
              <div className="rp-field">
                <label htmlFor="rp-password">New password</label>
                <input
                  id="rp-password"
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <div className="rp-field">
                <label htmlFor="rp-confirm">Confirm new password</label>
                <input
                  id="rp-confirm"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              {error && <p className="rp-error">{error}</p>}

              <button type="submit" className="rp-submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
