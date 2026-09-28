import { useState, type FormEvent } from 'react'
import { api } from '../api/index.ts'
import { DEMO_PASSWORD } from '../demo.ts'
import { errorMessage } from '../format.ts'
import type { User } from '../types.ts'

const DEMO_ACCOUNTS = [
  { username: 'alice', note: 'Employee, reports to Maria' },
  { username: 'charlie', note: 'Employee, reports to Mark' },
  { username: 'maria', note: 'Manager' },
  { username: 'mark', note: 'Manager' },
  { username: 'admin', note: 'Admin' },
]

export function LoginPage({ onLogin }: { onLogin(user: User): void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      onLogin(await api.login(username, password))
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Access Requests</h1>
        <p className="muted">Log in to request or approve access.</p>

        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <div className="demo-accounts">
          <div className="label">Demo accounts (password: {DEMO_PASSWORD})</div>
          <ul>
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.username}>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setUsername(a.username)
                    setPassword(DEMO_PASSWORD)
                  }}
                >
                  {a.username}
                </button>{' '}
                <span className="muted">{a.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </div>
  )
}
