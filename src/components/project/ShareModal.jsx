import { useEffect, useState } from 'react'
import { Share2, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { shares } from '../../lib/shares'
import { useToast } from '../../lib/ToastContext'
import { Modal, CopyButton, ConfirmDialog } from '../ui/Primitives'

export default function ShareModal({ open, onClose, projectId }) {
  const { push } = useToast()
  const [existing, setExisting] = useState([])
  const [sections, setSections] = useState({ overview: true, files: false, urls: false, apis: false })
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [creating, setCreating] = useState(false)
  const [toRevoke, setToRevoke] = useState(null)

  async function load() {
    const { data } = await supabase.from('shares').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    setExisting(data ?? [])
  }

  useEffect(() => { if (open) load() }, [open, projectId])

  async function create(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await shares.create(projectId, sections, password || undefined, expiresInDays ? Number(expiresInDays) : undefined)
      push('Share link created', 'success')
      setPassword('')
      load()
    } catch (error) {
      push(error.message || 'Could not create share link.', 'danger')
    }
    setCreating(false)
  }

  async function revoke() {
    await shares.revoke(toRevoke.id)
    setToRevoke(null)
    load()
  }

  return (
    <Modal open={open} onClose={onClose} title="Share project" width={480}>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 0 }}>
        Secrets and private notes are never included in a share, regardless of what's selected below.
      </p>

      <form onSubmit={create}>
        <div className="field">
          <label>Include</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            {[['overview', 'Project overview'], ['files', 'Files'], ['urls', 'URLs'], ['apis', 'APIs']].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={sections[key]} onChange={(e) => setSections({ ...sections, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Password (optional)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank for no password" />
        </div>
        <div className="field">
          <label>Expires</label>
          <select value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)}>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="">Never</option>
          </select>
        </div>
        <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={creating}>
          <Share2 size={14} /> {creating ? 'Creating…' : 'Create share link'}
        </button>
      </form>

      {existing.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 8, fontWeight: 600 }}>Active links</div>
          {existing.map((s) => {
            const url = `${window.location.origin}/share/${s.token}`
            const expired = s.expires_at && new Date(s.expires_at) < new Date()
            return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <div>
                  <div className="mono" style={{ color: s.revoked || expired ? 'var(--text-faint)' : 'var(--text)' }}>{url}</div>
                  <div style={{ color: 'var(--text-faint)', marginTop: 2 }}>
                    {s.revoked ? 'Revoked' : expired ? 'Expired' : s.expires_at ? `Expires ${new Date(s.expires_at).toLocaleDateString()}` : 'No expiration'}
                    {s.password_hash ? ' · Password protected' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {!s.revoked && !expired && <CopyButton value={url} label="Copy link" />}
                  {!s.revoked && <button className="icon-btn" onClick={() => setToRevoke(s)} title="Revoke"><Trash2 size={13} /></button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog open={!!toRevoke} onClose={() => setToRevoke(null)} onConfirm={revoke} title="Revoke share link" description="Anyone with this link will immediately lose access." confirmLabel="Revoke" />
    </Modal>
  )
}
