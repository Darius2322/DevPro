import { useEffect, useState } from 'react'
import { Plug, Plus, Trash2, Pencil, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { EmptyState, Modal, ConfirmDialog } from '../components/ui/Primitives'

const PROVIDERS = ['GitHub', 'GitLab', 'Vercel', 'Supabase', 'Netlify', 'Other']
const emptyForm = { provider: 'GitHub', account_label: '', profile_url: '', notes: '' }

export default function Connections() {
  const { user } = useAuth()
  const { push } = useToast()
  const [items, setItems] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)

  async function load() {
    const { data } = await supabase.from('connections').select('*').order('created_at', { ascending: false })
    setItems(data ?? [])
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(c) {
    setEditing(c)
    setForm({ provider: c.provider, account_label: c.account_label ?? '', profile_url: c.profile_url ?? '', notes: c.notes ?? '' })
    setModalOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    const payload = { ...form, user_id: user.id }
    const { error } = editing
      ? await supabase.from('connections').update(payload).eq('id', editing.id)
      : await supabase.from('connections').insert(payload)
    if (error) return push('Could not save.', 'danger')
    push(editing ? 'Updated' : 'Added', 'success')
    setModalOpen(false)
    load()
  }

  async function remove() {
    await supabase.from('connections').delete().eq('id', toDelete.id)
    setToDelete(null)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Connections</h1>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openCreate}>
          <Plus size={14} /> Add Connection
        </button>
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 4, marginBottom: 12 }}>
        Which GitHub, GitLab, Vercel, and Supabase accounts you use.
      </p>
      <p style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 0, marginBottom: 20 }}>
        This is a record you keep, not a live login — real one-click OAuth would need each provider's app
        registered with a callback server, which isn't set up. If that's worth doing later, it's a follow-up.
      </p>

      {items?.length === 0 && (
        <EmptyState title="No connections yet" description="Add the accounts you use across your projects." action={<button className="btn-primary" onClick={openCreate}>Add Connection</button>} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items?.map((c) => (
          <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plug size={16} color="var(--text-faint)" />
              <div>
                <strong style={{ fontSize: 13 }}>{c.provider}</strong>
                {c.account_label && <span style={{ color: 'var(--text-dim)', fontSize: 13 }}> · {c.account_label}</span>}
                {c.notes && <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{c.notes}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {c.profile_url && <a className="icon-btn" href={c.profile_url} target="_blank" rel="noreferrer"><ExternalLink size={13} /></a>}
              <button className="icon-btn" onClick={() => openEdit(c)}><Pencil size={13} /></button>
              <button className="icon-btn" onClick={() => setToDelete(c)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit connection' : 'Add connection'}>
        <form onSubmit={save}>
          <div className="field"><label>Provider</label>
            <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>{PROVIDERS.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div className="field"><label>Account label</label><input value={form.account_label} onChange={(e) => setForm({ ...form, account_label: e.target.value })} placeholder="Darius2322" /></div>
          <div className="field"><label>Profile URL</label><input value={form.profile_url} onChange={(e) => setForm({ ...form, profile_url: e.target.value })} placeholder="https://github.com/…" /></div>
          <div className="field"><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <button className="btn-primary" style={{ width: '100%' }}>{editing ? 'Save changes' : 'Add connection'}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Remove connection" description={`Remove "${toDelete?.provider}"?`} />
    </div>
  )
}
