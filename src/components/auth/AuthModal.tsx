import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import './AuthModal.css'

interface AuthModalProps {
  onClose: () => void
}

type Mode = 'signin' | 'register' | 'forgot'

export default function AuthModal({ onClose }: AuthModalProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const title =
    mode === 'signin' ? 'Sign in to Augusta Dev'
    : mode === 'register' ? 'Register on our platform'
    : 'Reset your password'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!supabase || !isSupabaseConfigured) {
      setError('Authentication is not configured for this deployment yet.')
      return
    }

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (mode === 'register' && (!firstName.trim() || !lastName.trim())) {
      setError('Please enter your first and last name.')
      return
    }

    setLoading(true)

    if (mode === 'signin') {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message)
      } else {
        onClose()
        if (data.session?.user?.app_metadata?.role === 'admin') {
          navigate('/admin')
        }
      }
    } else if (mode === 'register') {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      if (err) {
        setError(err.message)
      } else if (data.session) {
        onClose()
      } else {
        setInfo('Check your email to confirm your account.')
      }
    } else {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) {
        setError(err.message)
      } else {
        setInfo('Password reset link sent — check your email.')
      }
    }

    setLoading(false)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setInfo('')
  }

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="auth-titlebar">
          <span className="auth-titlebar__text">{title}</span>
          <button type="button" className="auth-titlebar__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="auth-body" onSubmit={handleSubmit}>
          {mode === 'forgot' ? (
            <>
              <p className="auth-forgot-desc">Enter your email and we'll send you a reset link.</p>
              <div className="auth-field">
                <label htmlFor="auth-email-forgot">Email</label>
                <input
                  id="auth-email-forgot"
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <>
              {mode === 'register' && (
                <div className="auth-field-row">
                  <div className="auth-field">
                    <label htmlFor="auth-firstname">First name</label>
                    <input
                      id="auth-firstname"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                      disabled={loading}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="auth-lastname">Last name</label>
                    <input
                      id="auth-lastname"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <div className="auth-field__label-row">
                  <label htmlFor="auth-password">Password</label>
                  {mode === 'signin' && (
                    <a className="auth-forgot-link" onClick={() => switchMode('forgot')}>Forgot password?</a>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  disabled={loading}
                />
              </div>

              {mode === 'register' && (
                <div className="auth-field">
                  <label htmlFor="auth-confirm">Confirm password</label>
                  <input
                    id="auth-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              )}
            </>
          )}

          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}

          {!info && (
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'signin' ? 'Sign in'
                : mode === 'register' ? 'Register account'
                : 'Send reset link'}
            </button>
          )}

          {!isSupabaseConfigured && (
            <p className="auth-info">Sign-in is disabled until Supabase environment variables are configured.</p>
          )}

          <p className="auth-toggle">
            {mode === 'forgot' ? (
              <>Remembered it?{' '}
                <a onClick={() => switchMode('signin')}>Back to sign in</a>
              </>
            ) : mode === 'signin' ? (
              <>Don't have an account?{' '}
                <a onClick={() => switchMode('register')}>Register here</a>
              </>
            ) : (
              <>Already have an account?{' '}
                <a onClick={() => switchMode('signin')}>Sign in here</a>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
