import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import PasswordInput from '../components/ui/PasswordInput'

export default function Signup() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setBusy(true)
    const { error } = await signUp(email, password, { full_name: fullName, phone })
    setBusy(false)
    if (error) {
      // Surface Supabase's own message — these are safe, specific, and
      // much more useful for debugging than a generic fallback.
      setError(error.message || 'Could not create account.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card" style={{ maxWidth: 380, textAlign: 'center', borderRadius: 20 }}>
          <strong>Check your email</strong>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            We sent a confirmation link to {email}. Confirm your address, then sign in — you'll get a quick
            optional step to fill in a few more details afterward.
          </p>
          <Link to="/login" className="btn-ghost" style={{ display: 'inline-block', marginTop: 8 }}>Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={onSubmit} className="card" style={{ width: '100%', maxWidth: 380, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <ShieldCheck size={20} color="var(--vault)" />
          <strong style={{ fontSize: 16 }}>Create your DevPro account</strong>
        </div>

        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input id="phone" type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput id="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <PasswordInput id="confirmPassword" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -6 }}>{error}</p>}

        <button className="btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginTop: 16 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
