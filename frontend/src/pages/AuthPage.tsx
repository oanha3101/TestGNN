import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, UserPlus } from 'lucide-react'

type AuthPageProps = {
  isBusy: boolean
  error: string | null
  onLogin: (input: { email: string; password: string }) => Promise<void>
  onRegister: (input: { displayName: string; email: string; password: string }) => Promise<void>
  onBack: () => void
}

export function AuthPage({ isBusy, error, onLogin, onRegister, onBack }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'login') {
      await onLogin({ email, password })
      return
    }
    await onRegister({ displayName, email, password })
  }

  return (
    <div className="auth-page-root">
      {/* Ambient */}
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      {/* Back nav */}
      <button className="auth-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="auth-page-center">
        {/* Logo */}
        <div className="auth-logo-row">
          <div className="brand-mark auth-brand-mark">G</div>
          <span className="auth-brand-label">GNN Neural Platform</span>
        </div>

        <div className="auth-card">
          {/* Card header */}
          <div className="auth-card-header">
            <div className="auth-card-icon">
              {mode === 'login'
                ? <KeyRound size={22} />
                : <UserPlus size={22} />}
            </div>
            <div>
              <h1 className="auth-card-title">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="auth-card-sub">
                {mode === 'login'
                  ? 'Sign in to access your workspace'
                  : 'Join the GNN research community'}
              </p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'login' ? 'auth-mode-tab-active' : ''}`}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'register' ? 'auth-mode-tab-active' : ''}`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form className="auth-form-pro" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-display-name">
                  Display Name
                </label>
                <input
                  id="auth-display-name"
                  className="auth-input"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={isBusy}
                  autoFocus
                />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">
                Email address
              </label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isBusy}
                autoFocus={mode === 'login'}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="auth-password"
                  className="auth-input auth-input-pass"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  disabled={isBusy}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="auth-error-box">
                <span>{error}</span>
              </div>
            )}

            <button className="auth-submit-btn" type="submit" disabled={isBusy}>
              {isBusy
                ? <><Loader2 size={17} className="auth-spinner" /> Processing...</>
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Demo hint */}
          <p className="auth-demo-hint">
            Demo admin: <code>admin@gnn-vp.com</code> / <code>admin123</code>
          </p>
        </div>

        <p className="auth-footer-note">
          By signing in you agree to our{' '}
          <span className="auth-footer-link">Terms of Service</span> and{' '}
          <span className="auth-footer-link">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}
