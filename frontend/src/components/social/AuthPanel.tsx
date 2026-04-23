import { KeyRound, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

type AuthPanelProps = {
  isBusy: boolean
  error: string | null
  onLogin: (input: { email: string; password: string }) => Promise<void>
  onRegister: (input: { displayName: string; email: string; password: string }) => Promise<void>
}

export function AuthPanel({ isBusy, error, onLogin, onRegister }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'login') {
      await onLogin({ email, password })
      return
    }
    await onRegister({ displayName, email, password })
  }

  return (
    <section className="panel auth-panel">
      <h2 className="panel-title">{mode === 'login' ? <KeyRound size={18} /> : <UserPlus size={18} />} User Access</h2>
      <p className="panel-subtitle">Sign in or create an account to publish training posts, collaborate, and save items to the vault.</p>

      <div className="auth-toggle">
        <button
          type="button"
          className={mode === 'login' ? 'chip chip-active' : 'chip'}
          onClick={() => setMode('login')}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'chip chip-active' : 'chip'}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'register' ? (
          <label>
            <span>Display Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              disabled={isBusy}
            />
          </label>
        ) : null}

        <label>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isBusy}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
            disabled={isBusy}
          />
        </label>

        <button className="cta" type="submit" disabled={isBusy}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p className="phase-label">Demo admin: `admin@gnn-vp.com / admin123`</p>
      {error ? <p className="auth-error">{error}</p> : null}
    </section>
  )
}
