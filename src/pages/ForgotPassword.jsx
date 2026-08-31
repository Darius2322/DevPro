import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await resetPassword(email)
    setBusy(false)
    if (error) {
      setError(error.message || 'Could not send reset link.')
      return
    }
    setDone(true)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <ShieldCheck size={20} color="var(--vault)" />
          <strong style={{ fontSize: 16 }}>Reset your password</strong>
        </div>

        {done ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            If an account exists for {email}, a reset link is on its way. Follow it to choose a new password.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -6 }}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginTop: 16 }}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
