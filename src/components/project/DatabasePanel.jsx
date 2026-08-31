import { useEffect, useState } from 'react'
import { Database, Save, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { CopyButton } from '../ui/Primitives'

const emptyForm = { provider: '', database_url: '', project_ref: '', schema_notes: '', rls_notes: '', edge_functions_notes: '', notes: '' }

export default function DatabasePanel({ projectId, onSwitchTab }) {
  const { push } = useToast()
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('databases').select('*').eq('project_id', projectId).maybeSingle()
    if (data) {
      setRecord(data)
      setForm({
        provider: data.provider ?? '', database_url: data.database_url ?? '', project_ref: data.project_ref ?? '',
        schema_notes: data.schema_notes ?? '', rls_notes: data.rls_notes ?? '', edge_functions_notes: data.edge_functions_notes ?? '',
        notes: data.notes ?? ''
      })
    }
  }

  useEffect(() => { load() }, [projectId])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, project_id: projectId }
    const { error } = record
      ? await supabase.from('databases').update(payload).eq('id', record.id)
      : await supabase.from('databases').insert(payload)
    setSaving(false)
    if (error) return push(error.message || 'Could not save database info.', 'danger')
    await logActivity({ projectId, action: 'Database info updated' })
    push('Saved', 'success')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Database size={16} color="var(--text-dim)" />
        <h2 style={{ fontSize: 15, margin: 0 }}>Database</h2>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 0 }}>
        SQL files, migrations, and schema dumps go in{' '}
        <button className="icon-btn" style={{ display: 'inline', padding: 0, textDecoration: 'underline', color: 'var(--accent)' }} onClick={() => onSwitchTab?.('Files')}>
          Files
        </button>
        . Connection secrets (service-role keys, DB passwords) belong in Secrets, not here.
      </p>

      <form onSubmit={save} className="card" style={{ maxWidth: 480 }}>
        <div className="field"><label>Provider</label><input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Supabase" /></div>
        <div className="field">
          <label>Database / project URL</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ flex: 1 }} value={form.database_url} onChange={(e) => setForm({ ...form, database_url: e.target.value })} placeholder="https://xxxx.supabase.co" />
            {form.database_url && <><CopyButton value={form.database_url} label="Copy URL" /><a className="icon-btn" href={form.database_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></>}
          </div>
        </div>
        <div className="field"><label>Project reference</label><input value={form.project_ref} onChange={(e) => setForm({ ...form, project_ref: e.target.value })} /></div>
        <div className="field"><label>Schema notes</label><textarea rows={3} value={form.schema_notes} onChange={(e) => setForm({ ...form, schema_notes: e.target.value })} placeholder="Key tables, relationships…" /></div>
        <div className="field"><label>RLS policy notes</label><textarea rows={2} value={form.rls_notes} onChange={(e) => setForm({ ...form, rls_notes: e.target.value })} /></div>
        <div className="field"><label>Edge Functions notes</label><textarea rows={2} value={form.edge_functions_notes} onChange={(e) => setForm({ ...form, edge_functions_notes: e.target.value })} /></div>
        <div className="field"><label>Other notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
