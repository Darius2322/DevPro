import { useEffect, useState } from 'react'
import { ExternalLink, Plus, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeTable } from '../../lib/useRealtimeTable'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { Badge, CopyButton, EmptyState, Modal, ConfirmDialog } from '../ui/Primitives'

const TYPES = ['Website', 'GitHub', 'Hosting', 'Database', 'API', 'Documentation', 'Dashboard', 'Other']
const ENVS = ['Development', 'Staging', 'Production', 'Testing']

const emptyForm = { name: '', url: '', type: 'Website', environment: 'Production', description: '', project_id: '' }

export default function UrlsPanel({ projectId, projects }) {
  const { push } = useToast()
  const [urls, setUrls] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm, project_id: projectId ?? '' })
  const [toDelete, setToDelete] = useState(null)

  async function load() {
    let q = supabase.from('urls').select('*, projects(name)').order('created_at', { ascending: false })
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    setUrls(data ?? [])
  }

  useEffect(() => { load() }, [projectId])
  useRealtimeTable('urls', projectId, load)

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, project_id: projectId ?? '' })
    setModalOpen(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({ name: u.name, url: u.url, type: u.type, environment: u.environment, description: u.description ?? '', project_id: u.project_id })
    setModalOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    if (editing) {
      const { error } = await supabase.from('urls').update(form).eq('id', editing.id)
      if (error) return push(error.message || 'Could not update URL.', 'danger')
      await logActivity({ projectId: form.project_id, action: 'URL updated', detail: form.name })
    } else {
      const { error } = await supabase.from('urls').insert(form)
      if (error) return push(error.message || 'Could not add URL.', 'danger')
      await logActivity({ projectId: form.project_id, action: 'URL added', detail: form.name })
    }
    push(editing ? 'URL updated' : 'URL added', 'success')
    setModalOpen(false)
    load()
  }

  async function remove() {
    await supabase.from('urls').delete().eq('id', toDelete.id)
    await logActivity({ projectId: toDelete.project_id, action: 'URL removed', detail: toDelete.name })
    setToDelete(null)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>URLs</h2>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openCreate}>
          <Plus size={14} /> Add URL
        </button>
      </div>

      {urls?.length === 0 && (
        <EmptyState title="No URLs yet" description="Track production, hosting, database, and API links here." action={<button className="btn-primary" onClick={openCreate}>Add URL</button>} />
      )}

      {urls?.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Environment</th>
                {!projectId && <th>Project</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {urls.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{u.name}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.url}</div>
                  </td>
                  <td><Badge>{u.type}</Badge></td>
                  <td style={{ color: 'var(--text-dim)' }}>{u.environment}</td>
                  {!projectId && <td style={{ color: 'var(--text-dim)' }}>{u.projects?.name ?? '—'}</td>}
                  <td>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <a className="icon-btn" href={u.url} target="_blank" rel="noreferrer" title="Open"><ExternalLink size={14} /></a>
                      <CopyButton value={u.url} label="Copy URL" />
                      <button className="icon-btn" onClick={() => openEdit(u)} title="Edit"><Pencil size={14} /></button>
                      <button className="icon-btn" onClick={() => setToDelete(u)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit URL' : 'Add URL'}>
        <form onSubmit={save}>
          {!projectId && projects && (
            <div className="field">
              <label>Project</label>
              <select required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="" disabled>Select a project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production site" />
          </div>
          <div className="field">
            <label>URL</label>
            <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Environment</label>
            <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
              {ENVS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn-primary" style={{ width: '100%' }}>{editing ? 'Save changes' : 'Add URL'}</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Delete URL"
        description={`Remove "${toDelete?.name}"? This can't be undone.`}
      />
    </div>
  )
}
