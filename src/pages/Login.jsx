import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import PasswordInput from '../components/ui/PasswordInput'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) {
      // Distinguish the common cases instead of masking everything as
      // "wrong password" — that's what makes an unconfirmed-email account
      // impossible to debug from the UI.
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email first — check your inbox for the confirmation link.')
      } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password.')
      } else {
        setError(error.message || 'Could not sign in.')
      }
      return
    }
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={onSubmit} className="card" style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <ShieldCheck size={20} color="var(--vault)" />
          <strong style={{ fontSize: 16 }}>DevPro</strong>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput id="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -6 }}>{error}</p>}
        <button className="btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginTop: 16 }}>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  )
}
