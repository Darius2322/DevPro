import { useEffect, useState } from 'react'
import { Github, ExternalLink, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { CopyButton } from '../ui/Primitives'

const emptyForm = {
  repository_url: '', default_branch: 'main', github_account: '', organization: '',
  actions_notes: '', deployment_notes: ''
}

export default function GithubPanel({ projectId }) {
  const { push } = useToast()
  const [record, setRecord] = useState(null)
  const [secrets, setSecrets] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [tokenSecretId, setTokenSecretId] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: repo }, { data: secretRows }] = await Promise.all([
      supabase.from('github_repositories').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('secrets').select('id, name').eq('project_id', projectId)
    ])
    setSecrets(secretRows ?? [])
    if (repo) {
      setRecord(repo)
      setForm({
        repository_url: repo.repository_url ?? '', default_branch: repo.default_branch ?? 'main',
        github_account: repo.github_account ?? '', organization: repo.organization ?? '',
        actions_notes: repo.actions_notes ?? '', deployment_notes: repo.deployment_notes ?? ''
      })
      setTokenSecretId(repo.token_secret_id ?? '')
    }
  }

  useEffect(() => { load() }, [projectId])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, project_id: projectId, token_secret_id: tokenSecretId || null }
    const { error } = record
      ? await supabase.from('github_repositories').update(payload).eq('id', record.id)
      : await supabase.from('github_repositories').insert(payload)
    setSaving(false)
    if (error) return push('Could not save GitHub info.', 'danger')
    await logActivity({ projectId, action: 'GitHub info updated' })
    push('Saved', 'success')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Github size={16} color="var(--text-dim)" />
        <h2 style={{ fontSize: 15, margin: 0 }}>GitHub</h2>
      </div>

      <form onSubmit={save} className="card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Repository URL</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ flex: 1 }} value={form.repository_url} onChange={(e) => setForm({ ...form, repository_url: e.target.value })} placeholder="https://github.com/org/repo" />
            {form.repository_url && (
              <>
                <CopyButton value={form.repository_url} label="Copy repo URL" />
                <a className="icon-btn" href={form.repository_url} target="_blank" rel="noreferrer" title="Open"><ExternalLink size={14} /></a>
              </>
            )}
          </div>
        </div>
        <div className="field"><label>Default branch</label><input value={form.default_branch} onChange={(e) => setForm({ ...form, default_branch: e.target.value })} /></div>
        <div className="field"><label>GitHub account</label><input value={form.github_account} onChange={(e) => setForm({ ...form, github_account: e.target.value })} /></div>
        <div className="field"><label>Organization</label><input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></div>
        <div className="field">
          <label>Personal access token (reference a secret — the token itself lives in the Secrets Vault)</label>
          <select value={tokenSecretId} onChange={(e) => setTokenSecretId(e.target.value)}>
            <option value="">None</option>
            {secrets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field"><label>GitHub Actions notes</label><textarea rows={2} value={form.actions_notes} onChange={(e) => setForm({ ...form, actions_notes: e.target.value })} /></div>
        <div className="field"><label>Deployment notes</label><textarea rows={2} value={form.deployment_notes} onChange={(e) => setForm({ ...form, deployment_notes: e.target.value })} /></div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
