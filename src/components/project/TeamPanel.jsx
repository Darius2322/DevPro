import { useEffect, useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../lib/ToastContext'
import { Badge, EmptyState, Modal, ConfirmDialog } from '../ui/Primitives'

const ROLES = ['Admin', 'Editor', 'Viewer']

export default function TeamPanel({ projectId, ownerId }) {
  const { push } = useToast()
  const [members, setMembers] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Viewer')
  const [inviting, setInviting] = useState(false)
  const [toRemove, setToRemove] = useState(null)

  async function load() {
    const { data } = await supabase.from('project_members').select('user_id, role, profiles(email, full_name)').eq('project_id', projectId)
    setMembers(data ?? [])
  }

  useEffect(() => { load() }, [projectId])

  async function invite(e) {
    e.preventDefault()
    setInviting(true)
    const { error } = await supabase.rpc('invite_member_by_email', { p_project_id: projectId, p_email: email, p_role: role })
    setInviting(false)
    if (error) {
      const msg = error.message?.includes('no_such_user')
        ? 'No account found with that email — they need to sign up first.'
        : 'Could not add collaborator.'
      return push(msg, 'danger')
    }
    push('Collaborator added', 'success')
    setModalOpen(false)
    setEmail('')
    load()
  }

  async function remove() {
    await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', toRemove.user_id)
    setToRemove(null)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Team</h2>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setModalOpen(true)}>
          <UserPlus size={14} /> Invite
        </button>
      </div>

      {members?.length === 0 && (
        <EmptyState title="No collaborators yet" description="Invite someone by the email they signed up with." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Invite</button>} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {members?.map((m) => (
          <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13 }}>
              {m.profiles?.full_name || m.profiles?.email || m.user_id}
              {m.profiles?.full_name && <span style={{ color: 'var(--text-faint)' }}> · {m.profiles.email}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge>{m.role}</Badge>
              {m.user_id !== ownerId && (
                <button className="icon-btn" onClick={() => setToRemove(m)} title="Remove"><Trash2 size={13} /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invite collaborator">
        <form onSubmit={invite}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>They need an existing account with this email — invites for people who haven't signed up yet aren't supported here.</p>
          <button className="btn-primary" style={{ width: '100%' }} disabled={inviting}>{inviting ? 'Adding…' : 'Add to project'}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toRemove} onClose={() => setToRemove(null)} onConfirm={remove} title="Remove collaborator" description="They'll lose access to this project immediately." confirmLabel="Remove" />
    </div>
  )
}
