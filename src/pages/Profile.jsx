import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Clock, Laptop } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { currentDeviceId } from '../lib/deviceTracking'
import PasswordInput from '../components/ui/PasswordInput'
import Avatar from '../components/ui/Avatar'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const { push } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [thisDevice, setThisDevice] = useState(null)
  const [activity, setActivity] = useState(null)

  useEffect(() => {
    supabase.from('devices').select('*').eq('device_id', currentDeviceId()).maybeSingle().then(({ data }) => setThisDevice(data))
    supabase
      .from('activity_logs')
      .select('id, action, detail, created_at, project_id, projects(name)')
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setActivity(data ?? []))
  }, [])

  async function changePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) return push("Passwords don't match.", 'danger')
    if (newPassword.length < 8) return push('Password must be at least 8 characters.', 'danger')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) return push(error.message || 'Could not update password.', 'danger')
    push('Password updated', 'success')
    setNewPassword('')
    setConfirmPassword('')
  }

  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const lastVisited = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Profile</h1>

      <section className="card" style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <Avatar name={profile?.full_name} email={user?.email} size={48} />
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
          <div>Last visited: {lastVisited}</div>
          {thisDevice && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Laptop size={13} /> This device: {thisDevice.label || 'Unknown device'}
            </div>
          )}
          {profile?.profession && <div>Profession: {profile.profession}</div>}
          {profile?.github_username && <div>GitHub: {profile.github_username}</div>}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>Recent activity</h2>
          <Link to="/history" style={{ fontSize: 12 }}>View all</Link>
        </div>
        {activity?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Nothing yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          {activity?.map((a) => (
            <div key={a.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <Clock size={12} color="var(--text-faint)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span style={{ color: 'var(--text)' }}>{a.action}</span>
                {a.detail && <span style={{ color: 'var(--text-dim)' }}> — {a.detail}</span>}
                {a.projects?.name && <span style={{ color: 'var(--text-faint)' }}> · {a.projects.name}</span>}
                <div style={{ color: 'var(--text-faint)' }}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
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
