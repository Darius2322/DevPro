import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { Badge, CopyButton, EmptyState, Modal, ConfirmDialog } from '../ui/Primitives'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const ENVS = ['Development', 'Staging', 'Production', 'Testing']
const METHOD_TONE = { GET: 'active', POST: 'planning', PUT: 'paused', PATCH: 'paused', DELETE: 'danger' }

const emptyForm = {
  name: '', base_url: '', endpoint: '', method: 'GET', auth_type: '', description: '',
  documentation_url: '', environment: 'Production'
}

export default function ApisPanel({ projectId }) {
  const { push } = useToast()
  const [apis, setApis] = useState(null)
  const [secrets, setSecrets] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [apiKeySecretId, setApiKeySecretId] = useState('')
  const [toDelete, setToDelete] = useState(null)

  async function load() {
    const [{ data: apiRows }, { data: secretRows }] = await Promise.all([
      supabase.from('apis').select('*, secrets(name)').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('secrets').select('id, name').eq('project_id', projectId)
    ])
    setApis(apiRows ?? [])
    setSecrets(secretRows ?? [])
  }

  useEffect(() => { load() }, [projectId])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setApiKeySecretId('')
    setModalOpen(true)
  }

  function openEdit(a) {
    setEditing(a)
    setForm({
      name: a.name, base_url: a.base_url ?? '', endpoint: a.endpoint ?? '', method: a.method,
      auth_type: a.auth_type ?? '', description: a.description ?? '', documentation_url: a.documentation_url ?? '',
      environment: a.environment
    })
    setApiKeySecretId(a.api_key_secret_id ?? '')
    setModalOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    const payload = { ...form, project_id: projectId, api_key_secret_id: apiKeySecretId || null }
    if (editing) {
      const { error } = await supabase.from('apis').update(payload).eq('id', editing.id)
      if (error) return push('Could not update API.', 'danger')
      await logActivity({ projectId, action: 'API updated', detail: form.name })
    } else {
      const { error } = await supabase.from('apis').insert(payload)
      if (error) return push('Could not add API.', 'danger')
      await logActivity({ projectId, action: 'API added', detail: form.name })
    }
    push(editing ? 'API updated' : 'API added', 'success')
    setModalOpen(false)
    load()
  }

  async function remove() {
    await supabase.from('apis').delete().eq('id', toDelete.id)
    await logActivity({ projectId, action: 'API removed', detail: toDelete.name })
    setToDelete(null)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>APIs</h2>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openCreate}>
          <Plus size={14} /> Add API
        </button>
      </div>

      {apis?.length === 0 && (
        <EmptyState title="No APIs yet" description="Track endpoints, auth types, and documentation links." action={<button className="btn-primary" onClick={openCreate}>Add API</button>} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {apis?.map((a) => (
          <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13 }}>{a.name}</strong>
                <Badge tone={METHOD_TONE[a.method]}>{a.method}</Badge>
                <Badge>{a.environment}</Badge>
                {a.secrets?.name && <Badge tone="default">key: {a.secrets.name}</Badge>}
              </div>
              {(a.base_url || a.endpoint) && (
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>
                  {a.base_url}{a.endpoint}
                </div>
              )}
              {a.description && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{a.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {(a.base_url || a.endpoint) && <CopyButton value={`${a.base_url ?? ''}${a.endpoint ?? ''}`} label="Copy endpoint" />}
              {a.documentation_url && <a className="icon-btn" href={a.documentation_url} target="_blank" rel="noreferrer" title="Docs"><ExternalLink size={14} /></a>}
              <button className="icon-btn" onClick={() => openEdit(a)} title="Edit"><Pencil size={14} /></button>
              <button className="icon-btn" onClick={() => setToDelete(a)} title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit API' : 'Add API'}>
        <form onSubmit={save}>
          <div className="field"><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Payment API" /></div>
          <div className="field"><label>Base URL</label><input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.example.com" /></div>
          <div className="field"><label>Endpoint</label><input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="/v1/charges" /></div>
          <div className="field"><label>Method</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          </div>
          <div className="field"><label>Environment</label>
            <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>{ENVS.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div className="field"><label>Auth type</label><input value={form.auth_type} onChange={(e) => setForm({ ...form, auth_type: e.target.value })} placeholder="Bearer token, API key, OAuth…" /></div>
          <div className="field">
            <label>API key (reference a secret — never store the key here directly)</label>
            <select value={apiKeySecretId} onChange={(e) => setApiKeySecretId(e.target.value)}>
              <option value="">None</option>
              {secrets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Documentation URL</label><input value={form.documentation_url} onChange={(e) => setForm({ ...form, documentation_url: e.target.value })} /></div>
          <div className="field"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <button className="btn-primary" style={{ width: '100%' }}>{editing ? 'Save changes' : 'Add API'}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Delete API" description={`Remove "${toDelete?.name}"? This can't be undone.`} />
    </div>
  )
}
