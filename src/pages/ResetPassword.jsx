import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import PasswordInput from '../components/ui/PasswordInput'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) return setError("Passwords don't match.")
    if (password.length < 8) return setError('Password must be at least 8 characters.')

    setBusy(true)
    // The recovery link already establishes a session (detectSessionInUrl
    // is on), so this is just a normal authenticated password update.
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(error.message || 'Could not update password. The reset link may have expired — request a new one.')
      return
    }
    setDone(true)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <ShieldCheck size={20} color="var(--vault)" />
          <strong style={{ fontSize: 16 }}>Choose a new password</strong>
        </div>

        {done ? (
          <p style={{ color: 'var(--success)', fontSize: 13 }}>Password updated — taking you in…</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label>New password</label>
              <PasswordInput required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <PasswordInput required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -6 }}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
