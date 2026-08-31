import { useEffect, useState } from 'react'
import { Server, Save, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { CopyButton } from '../ui/Primitives'

const emptyForm = { provider: '', hosting_url: '', build_command: '', deploy_command: '', env_notes: '', last_deploy_at: '', notes: '' }

export default function HostingPanel({ projectId }) {
  const { push } = useToast()
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('hosting').select('*').eq('project_id', projectId).maybeSingle()
    if (data) {
      setRecord(data)
      setForm({
        provider: data.provider ?? '', hosting_url: data.hosting_url ?? '', build_command: data.build_command ?? '',
        deploy_command: data.deploy_command ?? '', env_notes: data.env_notes ?? '',
        last_deploy_at: data.last_deploy_at ? data.last_deploy_at.slice(0, 16) : '', notes: data.notes ?? ''
      })
    }
  }
  useEffect(() => { load() }, [projectId])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, last_deploy_at: form.last_deploy_at || null, project_id: projectId }
    const { error } = record
      ? await supabase.from('hosting').update(payload).eq('id', record.id)
      : await supabase.from('hosting').insert(payload)
    setSaving(false)
    if (error) return push(error.message || 'Could not save hosting info.', 'danger')
    await logActivity({ projectId, action: 'Hosting info updated' })
    push('Saved', 'success')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Server size={16} color="var(--text-dim)" />
        <h2 style={{ fontSize: 15, margin: 0 }}>Hosting</h2>
      </div>

      <form onSubmit={save} className="card" style={{ maxWidth: 480 }}>
        <div className="field"><label>Provider</label><input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Vercel, Netlify, Render…" /></div>
        <div className="field">
          <label>Hosting URL</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ flex: 1 }} value={form.hosting_url} onChange={(e) => setForm({ ...form, hosting_url: e.target.value })} placeholder="https://…" />
            {form.hosting_url && <><CopyButton value={form.hosting_url} label="Copy URL" /><a className="icon-btn" href={form.hosting_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></>}
          </div>
        </div>
        <div className="field"><label>Build command</label><input className="mono" value={form.build_command} onChange={(e) => setForm({ ...form, build_command: e.target.value })} placeholder="npm run build" /></div>
        <div className="field"><label>Deploy command</label><input className="mono" value={form.deploy_command} onChange={(e) => setForm({ ...form, deploy_command: e.target.value })} placeholder="vercel --prod" /></div>
        <div className="field"><label>Environment variable notes</label><textarea rows={2} value={form.env_notes} onChange={(e) => setForm({ ...form, env_notes: e.target.value })} placeholder="Which env vars are set where — actual values live in Secrets" /></div>
        <div className="field"><label>Last deploy</label><input type="datetime-local" value={form.last_deploy_at} onChange={(e) => setForm({ ...form, last_deploy_at: e.target.value })} /></div>
        <div className="field"><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
