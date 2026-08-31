import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeTable } from '../../lib/useRealtimeTable'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { EmptyState, Modal, ConfirmDialog } from '../ui/Primitives'

const emptyForm = { title: '', body: '' }

export default function NotesPanel({ projectId }) {
  const { push } = useToast()
  const [notes, setNotes] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toDelete, setToDelete] = useState(null)

  async function load() {
    const { data } = await supabase.from('notes').select('*').eq('project_id', projectId).order('updated_at', { ascending: false })
    setNotes(data ?? [])
  }

  useEffect(() => { load() }, [projectId])
  useRealtimeTable('notes', projectId, load)

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(n) { setEditing(n); setForm({ title: n.title, body: n.body ?? '' }); setModalOpen(true) }

  async function save(e) {
    e.preventDefault()
    if (editing) {
      const { error } = await supabase.from('notes').update(form).eq('id', editing.id)
      if (error) return push(error.message || 'Could not update note.', 'danger')
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('notes').insert({ ...form, project_id: projectId, created_by: userData.user.id })
      if (error) return push(error.message || 'Could not create note.', 'danger')
    }
    await logActivity({ projectId, action: editing ? 'Note updated' : 'Note added', detail: form.title })
    push('Saved', 'success')
    setModalOpen(false)
    load()
  }

  async function remove() {
    await supabase.from('notes').delete().eq('id', toDelete.id)
    await logActivity({ projectId, action: 'Note deleted', detail: toDelete.title })
    setToDelete(null)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Notes</h2>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={openCreate}>
          <Plus size={14} /> Add Note
        </button>
      </div>

      {notes?.length === 0 && <EmptyState title="No notes yet" description="Jot down anything worth remembering about this project." action={<button className="btn-primary" onClick={openCreate}>Add Note</button>} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {notes?.map((n) => (
          <div key={n.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 13 }}>{n.title}</strong>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="icon-btn" onClick={() => openEdit(n)}><Pencil size={13} /></button>
                <button className="icon-btn" onClick={() => setToDelete(n)}><Trash2 size={13} /></button>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, whiteSpace: 'pre-wrap' }}>{n.body}</p>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(n.updated_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit note' : 'Add note'}>
        <form onSubmit={save}>
          <div className="field"><label>Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Note</label><textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <button className="btn-primary" style={{ width: '100%' }}>{editing ? 'Save changes' : 'Add note'}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Delete note" description={`Delete "${toDelete?.title}"?`} />
    </div>
  )
}
