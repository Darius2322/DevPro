import { useEffect, useState } from 'react'
import { Bot, Plus, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { Badge, EmptyState, Modal, ConfirmDialog } from '../components/ui/Primitives'

const PROVIDERS = ['ChatGPT', 'Claude', 'Gemini', 'GitHub Copilot', 'Cursor', 'Replit', 'Other']
const CADENCE = ['', 'Hourly', 'Daily', 'Weekly', 'Monthly']

const emptyForm = { provider: 'Claude', account_label: '', plan: '', resets_at: '', reset_cadence: '', notes: '' }

export default function AiAccounts() {
  const { user } = useAuth()
  const { push } = useToast()
  const [accounts, setAccounts] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)

  async function load() {
    const { data } = await supabase.from('ai_accounts').select('*').order('created_at', { ascending: false })
    setAccounts(data ?? [])
  }
  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(a) {
    setEditing(a)
    setForm({ provider: a.provider, account_label: a.account_label ?? '', plan: a.plan ?? '', resets_at: a.resets_at ? a.resets_at.slice(0, 16) : '', reset_cadence: a.reset_cadence ?? '', notes: a.notes ?? '' })
    setModalOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    const payload = { ...form, resets_at: form.resets_at || null, user_id: user.id }
    const { error } = editing
      ? await supabase.from('ai_accounts').update(payload).eq('id', editing.id)
      : await supabase.from('ai_accounts').insert(payload)
    if (error) return push('Could not save.', 'danger')
    push(editing ? 'Updated' : 'Added', 'success')
    setModalOpen(false)
    load()
  }

  async function remove() {
    await supabase.from('ai_accounts').delete().eq('id', toDelete.id)
    setToDelete(null)
    load()
  }

  function resetLabel(a) {
    if (a.resets_at) {
      const d = new Date(a.resets_at)
      const hrs = Math.round((d - new Date()) / 3600000)
      if (hrs < 0) return 'Reset time passed'
      if (hrs < 48) return `Resets in ~${hrs}h`
      return `Resets ${d.toLocaleDateString()}`
    }
    if (a.reset_cadence) return `Resets ${a.reset_cadence.toLowerCase()}`
    return null
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>AI Accounts</h1>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openCreate}>
          <Plus size={14} /> Add Account
        </button>
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 4, marginBottom: 20 }}>The AI tools/subscriptions you use, and when their usage limits reset.</p>

      {accounts?.length === 0 && (
        <EmptyState title="No AI accounts yet" description="Track ChatGPT, Claude, Copilot, etc. and when your usage resets." action={<button className="btn-primary" onClick={openCreate}>Add Account</button>} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {accounts?.map((a) => (
          <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bot size={16} color="var(--text-faint)" />
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{a.provider}</strong>
                  {a.plan && <Badge>{a.plan}</Badge>}
                </div>
                {a.account_label && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{a.account_label}</div>}
                {resetLabel(a) && <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{resetLabel(a)}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <button className="icon-btn" onClick={() => openEdit(a)}><Pencil size={13} /></button>
              <button className="icon-btn" onClick={() => setToDelete(a)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit AI account' : 'Add AI account'}>
        <form onSubmit={save}>
          <div className="field"><label>Provider</label>
            <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>{PROVIDERS.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div className="field"><label>Account / plan label</label><input value={form.account_label} onChange={(e) => setForm({ ...form, account_label: e.target.value })} placeholder="Work account" /></div>
          <div className="field"><label>Plan</label><input value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Pro, Team, Free…" /></div>
          <div className="field"><label>Exact reset time (optional)</label><input type="datetime-local" value={form.resets_at} onChange={(e) => setForm({ ...form, resets_at: e.target.value })} /></div>
          <div className="field"><label>Or reset cadence</label>
            <select value={form.reset_cadence} onChange={(e) => setForm({ ...form, reset_cadence: e.target.value })}>{CADENCE.map((c) => <option key={c} value={c}>{c || 'None'}</option>)}</select>
          </div>
          <div className="field"><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <button className="btn-primary" style={{ width: '100%' }}>{editing ? 'Save changes' : 'Add account'}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Remove AI account" description={`Remove "${toDelete?.provider}"?`} />
    </div>
  )
}
