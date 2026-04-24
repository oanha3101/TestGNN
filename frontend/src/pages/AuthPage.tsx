import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  UserPlus,
} from 'lucide-react'
import { requestPasswordReset } from '../api/socialApiService'

type AuthPageProps = {
  isBusy: boolean
  error: string | null
  onLogin: (input: { email: string; password: string }) => Promise<void>
  onRegister: (input: {
    displayName: string
    email: string
    password: string
    acceptTerms: boolean
  }) => Promise<void>
  onBack: () => void
  onOpenTerms: () => void
  onOpenPrivacy: () => void
}

type Mode = 'login' | 'register' | 'forgot'

export function AuthPage({
  isBusy,
  error,
  onLogin,
  onRegister,
  onBack,
  onOpenTerms,
  onOpenPrivacy,
}: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  // forgot-password local state (independent of the auth hook so we can
  // surface the dev-mode reset link without the parent caring)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)
  const [forgotResetUrl, setForgotResetUrl] = useState<string | null>(null)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotBusy, setForgotBusy] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'login') {
      await onLogin({ email, password })
      return
    }
    if (mode === 'register') {
      await onRegister({ displayName, email, password, acceptTerms })
      return
    }
    // mode === 'forgot'
    setForgotBusy(true)
    setForgotError(null)
    setForgotMessage(null)
    setForgotResetUrl(null)
    try {
      const result = await requestPasswordReset(email)
      setForgotMessage(result.message)
      setForgotResetUrl(result.reset_url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to request reset link.'
      setForgotError(msg)
    } finally {
      setForgotBusy(false)
    }
  }

  const headerTitle =
    mode === 'login'
      ? 'Welcome back'
      : mode === 'register'
        ? 'Create account'
        : 'Forgot password'
  const headerSubtitle =
    mode === 'login'
      ? 'Sign in to access your workspace'
      : mode === 'register'
        ? 'Join the GNN research community'
        : "Enter your email and we'll send a reset link"
  const HeaderIcon = mode === 'forgot' ? Mail : mode === 'register' ? UserPlus : KeyRound

  const registerBlocked = mode === 'register' && !acceptTerms

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
              <HeaderIcon size={22} />
            </div>
            <div>
              <h1 className="auth-card-title">{headerTitle}</h1>
              <p className="auth-card-sub">{headerSubtitle}</p>
            </div>
          </div>

          {/* Mode toggle — hidden while forgot-password is active */}
          {mode !== 'forgot' && (
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
          )}

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
                disabled={isBusy || forgotBusy}
                autoFocus={mode === 'login' || mode === 'forgot'}
              />
            </div>

            {mode !== 'forgot' && (
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
                {mode === 'login' && (
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => {
                      setMode('forgot')
                      setForgotMessage(null)
                      setForgotError(null)
                      setForgotResetUrl(null)
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {mode === 'register' && (
              <label className="auth-terms-row" htmlFor="auth-accept-terms">
                <input
                  id="auth-accept-terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  disabled={isBusy}
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    className="auth-terms-link"
                    onClick={onOpenTerms}
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    className="auth-terms-link"
                    onClick={onOpenPrivacy}
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            )}

            {/* Error banners */}
            {mode !== 'forgot' && error && (
              <div className="auth-error-box">
                <span>{error}</span>
              </div>
            )}
            {mode === 'forgot' && forgotError && (
              <div className="auth-error-box">
                <span>{forgotError}</span>
              </div>
            )}
            {mode === 'forgot' && forgotMessage && (
              <div className="auth-info-box">
                <CheckCircle2 size={16} />
                <div>
                  <strong>{forgotMessage}</strong>
                  {forgotResetUrl && (
                    <p className="auth-info-sub">
                      Dev shortcut (SMTP not configured):{' '}
                      <a href={forgotResetUrl}>open reset link</a>
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              className="auth-submit-btn"
              type="submit"
              disabled={isBusy || forgotBusy || registerBlocked}
              title={
                registerBlocked
                  ? 'Please accept the Terms of Service and Privacy Policy.'
                  : undefined
              }
            >
              {isBusy || forgotBusy ? (
                <>
                  <Loader2 size={17} className="auth-spinner" /> Processing...
                </>
              ) : mode === 'login' ? (
                'Sign In'
              ) : mode === 'register' ? (
                'Create Account'
              ) : (
                'Send reset link'
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                className="auth-secondary-btn"
                onClick={() => setMode('login')}
              >
                Back to sign in
              </button>
            )}
          </form>

          {/* Demo hint */}
          {mode === 'login' && (
            <p className="auth-demo-hint">
              Demo admin: <code>admin@gnn-vp.com</code> / <code>admin123</code>
            </p>
          )}
        </div>

        <p className="auth-footer-note">
          By signing in you agree to our{' '}
          <button type="button" className="auth-footer-link" onClick={onOpenTerms}>
            Terms of Service
          </button>{' '}
          and{' '}
          <button type="button" className="auth-footer-link" onClick={onOpenPrivacy}>
            Privacy Policy
          </button>
          .
        </p>
      </div>
    </div>
  )
}
