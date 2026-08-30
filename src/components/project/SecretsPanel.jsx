import { useEffect, useState } from 'react'
import { Eye, EyeOff, Copy, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeTable } from '../../lib/useRealtimeTable'
import { secretsVault } from '../../lib/secretsVault'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { Badge, EmptyState, Modal, ConfirmDialog } from '../ui/Primitives'
import ReAuthModal from '../ui/ReAuthModal'

const TYPES = ['GitHub Token', 'API Key', 'Supabase Key', 'Vercel Token', 'Database Password', 'SMTP Password', 'OAuth Secret', 'Other']
const ENVS = ['Development', 'Staging', 'Production', 'Testing']

function maskFor(name) {
  return '•'.repeat(Math.min(24, Math.max(12, name.length + 6)))
}

function expiryTone(expiresAt) {
  if (!expiresAt) return null
  const days = (new Date(expiresAt) - new Date()) / 86400000
  if (days < 0) return { tone: 'danger', label: 'Expired' }
  if (days < 14) return { tone: 'paused', label: `Expires in ${Math.ceil(days)}d` }
  return null
}

export default function SecretsPanel({ projectId, projects }) {
  const { push } = useToast()
  const [secrets, setSecrets] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'API Key', environment: 'Production', description: '', expires_at: '', value: '', project_id: projectId ?? '' })
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [revealed, setRevealed] = useState({}) // secretId -> plaintext value
  const [pendingReveal, setPendingReveal] = useState(null) // secretId awaiting re-auth
  const [pendingCopy, setPendingCopy] = useState(null)

  async function load() {
    let q = supabase.from('secrets').select('*, projects(name)').order('created_at', { ascending: false })
    if (projectId) q = q.eq('project_id', projectId)
    const { data } = await q
    setSecrets(data ?? [])
  }

  useEffect(() => { load() }, [projectId])
  useRealtimeTable('secrets', projectId, load)

  function openCreate() {
    setForm({ name: '', type: 'API Key', environment: 'Production', description: '', expires_at: '', value: '', project_id: projectId ?? '' })
    setModalOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const { value, project_id, ...metadata } = form
    try {
      await secretsVault.create(project_id, value, metadata)
      await logActivity({ projectId: project_id, action: 'Secret created', detail: form.name })
      push('Secret saved', 'success')
      setModalOpen(false)
      load()
    } catch {
      push('Could not save secret.', 'danger')
    }
    setSaving(false)
  }

  async function remove() {
    await supabase.from('secrets').delete().eq('id', toDelete.id)
    await logActivity({ projectId: toDelete.project_id, action: 'Secret deleted', detail: toDelete.name })
    setToDelete(null)
    setRevealed((r) => { const c = { ...r }; delete c[toDelete.id]; return c })
    load()
  }

  async function doReveal(secretId) {
    try {
      const { value } = await secretsVault.reveal(secretId)
      setRevealed((r) => ({ ...r, [secretId]: value }))
      const s = secrets.find((x) => x.id === secretId)
      await logActivity({ projectId: s?.project_id, action: 'Secret revealed', detail: s?.name })
      // Auto-hide again after 20s so it doesn't stay exposed on screen.
      setTimeout(() => setRevealed((r) => { const c = { ...r }; delete c[secretId]; return c }), 20000)
    } catch {
      push('Could not reveal secret.', 'danger')
    }
  }

  async function doCopy(secretId) {
    try {
      const cached = revealed[secretId]
      const value = cached ?? (await secretsVault.reveal(secretId)).value
      await navigator.clipboard.writeText(value)
      const s = secrets.find((x) => x.id === secretId)
      await logActivity({ projectId: s?.project_id, action: 'Secret copied', detail: s?.name })
      push('Copied to clipboard')
    } catch {
      push('Could not copy secret.', 'danger')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Secrets Vault</h2>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openCreate}>
          <Plus size={14} /> Add Secret
        </button>
      </div>

      {secrets?.length === 0 && (
        <EmptyState title="No secrets yet" description="Store tokens, API keys, and credentials — encrypted, never shown in plaintext by default." action={<button className="btn-primary" onClick={openCreate}>Add Secret</button>} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {secrets?.map((s) => {
          const warn = expiryTone(s.expires_at)
          const isRevealed = revealed[s.id] !== undefined
          return (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{s.name}</strong>
                  <Badge>{s.type}</Badge>
                  <Badge>{s.environment}</Badge>
                  {!projectId && s.projects?.name && <Badge tone="default">{s.projects.name}</Badge>}
                  {warn && <Badge tone={warn.tone}><AlertTriangle size={11} style={{ marginRight: 3 }} />{warn.label}</Badge>}
                </div>
                <div className="secret-value" style={{ marginTop: 6, fontSize: 13 }}>
                  {isRevealed ? revealed[s.id] : maskFor(s.name)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="icon-btn" title={isRevealed ? 'Hide' : 'Reveal'} onClick={() => (isRevealed ? setRevealed((r) => { const c = { ...r }; delete c[s.id]; return c }) : setPendingReveal(s.id))}>
                  {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button className="icon-btn" title="Copy" onClick={() => setPendingCopy(s.id)}>
                  <Copy size={14} />
                </button>
                <button className="icon-btn" title="Rotate value" onClick={() => setPendingReveal(`rotate:${s.id}`)}>
                  <RefreshCw size={14} />
                </button>
                <button className="icon-btn" title="Delete" onClick={() => setToDelete(s)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Secret">
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
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GITHUB_TOKEN" />
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
            <label>Value</label>
            <input required type="password" className="mono" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div className="field">
            <label>Expiration date (optional)</label>
            <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn-primary" style={{ width: '100%' }} disabled={saving}>{saving ? 'Encrypting & saving…' : 'Save Secret'}</button>
        </form>
      </Modal>

      <ReAuthModal
        open={!!pendingReveal}
        onClose={() => setPendingReveal(null)}
        title="Confirm to reveal secret"
        onConfirmed={() => { const id = pendingReveal; setPendingReveal(null); if (id?.startsWith('rotate:')) { /* rotate flow could open edit-value modal here */ } else doReveal(id) }}
      />
      <ReAuthModal
        open={!!pendingCopy}
        onClose={() => setPendingCopy(null)}
        title="Confirm to copy secret"
        onConfirmed={() => { const id = pendingCopy; setPendingCopy(null); doCopy(id) }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Delete secret"
        description={`Permanently delete "${toDelete?.name}"? This can't be undone.`}
      />
    </div>
  )
}
