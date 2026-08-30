import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const PROFESSIONS = ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'Mobile Developer', 'DevOps / Infra', 'Designer', 'Product / Founder', 'Student', 'Other']

export default function Onboarding() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [githubUsername, setGithubUsername] = useState('')
  const [profession, setProfession] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile?.onboarding_completed) return <Navigate to="/" replace />

  async function finish(markComplete) {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        github_username: githubUsername || null,
        profession: profession || null,
        onboarding_completed: true
      })
      .eq('id', user.id)
    setSaving(false)
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <ShieldCheck size={20} color="var(--vault)" />
          <strong style={{ fontSize: 16 }}>A few more details</strong>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 0 }}>
          Totally optional — helps personalize things a bit. You can skip this and fill it in later from Settings.
        </p>

        <div className="field">
          <label>GitHub username</label>
          <input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} placeholder="octocat" />
        </div>
        <div className="field">
          <label>What best describes you?</label>
          <select value={profession} onChange={(e) => setProfession(e.target.value)}>
            <option value="">Prefer not to say</option>
            {PROFESSIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => finish(true)} disabled={saving}>Skip</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => finish(true)} disabled={saving}>
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
