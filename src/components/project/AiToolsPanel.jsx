import { useEffect, useState } from 'react'
import { Plus, Trash2, Bot } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { Badge, EmptyState, Modal, ConfirmDialog } from '../ui/Primitives'

const PROVIDERS = ['ChatGPT', 'Claude', 'Gemini', 'GitHub Copilot', 'Cursor', 'Replit', 'Other']

const emptyForm = { provider: 'Claude', account_label: '', purpose: '', used_at: new Date().toISOString().slice(0, 10), notes: '' }

export default function AiToolsPanel({ projectId }) {
  const { push } = useToast()
  const [entries, setEntries] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filterProvider, setFilterProvider] = useState('all')
  const [toDelete, setToDelete] = useState(null)

  async function load() {
    const { data } = await supabase.from('ai_usage').select('*').eq('project_id', projectId).order('used_at', { ascending: false }).order('created_at', { ascending: false })
    setEntries(data ?? [])
  }

  useEffect(() => { load() }, [projectId])

  async function save(e) {
    e.preventDefault()
    const { error } = await supabase.from('ai_usage').insert({ ...form, project_id: projectId })
    if (error) return push(error.message || 'Could not save entry.', 'danger')
    await logActivity({ projectId, action: `${form.provider} usage logged`, detail: form.purpose || null })
    push('Logged', 'success')
    setModalOpen(false)
    setForm(emptyForm)
    load()
  }

  async function remove() {
    await supabase.from('ai_usage').delete().eq('id', toDelete.id)
    setToDelete(null)
    load()
  }

  const filtered = entries?.filter((e) => filterProvider === 'all' || e.provider === filterProvider) ?? []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>AI Tools</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)' }}>
            <option value="all">All tools</option>
            {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Log usage
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState title="No AI usage logged yet" description="Track which AI tools helped with this project, and why — never store account passwords here." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Log usage</button>} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((e) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Bot size={14} color="var(--text-faint)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13 }}>
                  <Badge>{e.provider}</Badge>{' '}
                  {e.purpose && <span>{e.purpose}</span>}
                  {e.account_label && <span style={{ color: 'var(--text-faint)' }}> · {e.account_label}</span>}
                </div>
                {e.notes && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{e.notes}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{new Date(e.used_at).toLocaleDateString()}</div>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setToDelete(e)} title="Delete"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log AI usage">
        <form onSubmit={save}>
          <div className="field"><label>Provider</label>
            <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>{PROVIDERS.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div className="field"><label>Account / identifier</label><input value={form.account_label} onChange={(e) => setForm({ ...form, account_label: e.target.value })} placeholder="Development account" /></div>
          <div className="field"><label>Used for</label><input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Database architecture" /></div>
          <div className="field"><label>Date</label><input type="date" value={form.used_at} onChange={(e) => setForm({ ...form, used_at: e.target.value })} /></div>
          <div className="field"><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <button className="btn-primary" style={{ width: '100%' }}>Log usage</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Delete entry" description="Remove this AI usage entry?" />
    </div>
  )
}
