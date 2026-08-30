import { useState } from 'react'
import { LogOut, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import PasswordInput from '../components/ui/PasswordInput'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const { push } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function changePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) return push("Passwords don't match.", 'danger')
    if (newPassword.length < 8) return push('Password must be at least 8 characters.', 'danger')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) return push('Could not update password.', 'danger')
    push('Password updated', 'success')
    setNewPassword('')
    setConfirmPassword('')
  }

  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Profile</h1>

      <section className="card" style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={22} color="var(--text-dim)" />
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{profile?.full_name || user?.email}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{user?.email}</div>
          {profile?.phone && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{profile.phone}</div>}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Details</h2>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>Member since: {joined}</div>
          {profile?.profession && <div>Profession: {profile.profession}</div>}
          {profile?.github_username && <div>GitHub: {profile.github_username}</div>}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Change password</h2>
        <form onSubmit={changePassword}>
          <div className="field">
            <label>New password</label>
            <PasswordInput required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <PasswordInput required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>

      <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={signOut}>
        <LogOut size={14} /> Sign out
      </button>
    </div>
  )
}
