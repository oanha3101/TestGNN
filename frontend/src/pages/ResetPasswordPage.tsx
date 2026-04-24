import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { submitPasswordReset } from '../api/socialApiService'

type ResetPasswordPageProps = {
  token: string
  onBack: () => void
  onSignIn: () => void
}

/** Consume the reset token from the email link and set a new password.
 *  The token is treated as opaque — we only POST it back; the backend
 *  validates expiry, single-use, and rejects already-consumed tokens. */
export function ResetPasswordPage({ token, onBack, onSignIn }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const mismatch = confirm.length > 0 && password !== confirm

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mismatch) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const result = await submitPasswordReset({ token, password })
      setDone(result.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reset password.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page-root">
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      <button className="auth-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="auth-page-center">
        <div className="auth-logo-row">
          <div className="brand-mark auth-brand-mark">G</div>
          <span className="auth-brand-label">GNN Neural Platform</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-icon">
              <KeyRound size={22} />
            </div>
            <div>
              <h1 className="auth-card-title">Reset password</h1>
              <p className="auth-card-sub">
                Set a new password for your GNN-VP account.
              </p>
            </div>
          </div>

          {done ? (
            <div className="auth-form-pro">
              <div className="auth-info-box">
                <CheckCircle2 size={16} />
                <div>
                  <strong>{done}</strong>
                </div>
              </div>
              <button type="button" className="auth-submit-btn" onClick={onSignIn}>
                Sign in with new password
              </button>
            </div>
          ) : (
            <form className="auth-form-pro" onSubmit={onSubmit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-password">
                  New password
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="reset-password"
                    className="auth-input auth-input-pass"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    disabled={busy}
                    autoFocus
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

              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-confirm">
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  className="auth-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={6}
                  required
                  disabled={busy}
                />
              </div>

              {error && (
                <div className="auth-error-box">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={busy || mismatch || password.length < 6}
              >
                {busy ? (
                  <>
                    <Loader2 size={17} className="auth-spinner" /> Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
