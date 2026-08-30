import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useRealtimeTable } from '../../lib/useRealtimeTable'
import { logActivity } from '../../lib/activity'
import { useToast } from '../../lib/ToastContext'
import { EmptyState } from '../ui/Primitives'

export default function ProgressPanel({ projectId }) {
  const { push } = useToast()
  const [percent, setPercent] = useState(0)
  const [milestones, setMilestones] = useState(null)
  const [title, setTitle] = useState('')

  async function load() {
    const [{ data: project }, { data: items }] = await Promise.all([
      supabase.from('projects').select('progress_percent').eq('id', projectId).single(),
      supabase.from('project_milestones').select('*').eq('project_id', projectId).order('position')
    ])
    setPercent(project?.progress_percent ?? 0)
    setMilestones(items ?? [])
  }
  useEffect(() => { load() }, [projectId])
  useRealtimeTable('project_milestones', projectId, load)

  async function updatePercent(value) {
    setPercent(value)
    await supabase.from('projects').update({ progress_percent: value }).eq('id', projectId)
  }

  async function addMilestone(e) {
    e.preventDefault()
    if (!title.trim()) return
    await supabase.from('project_milestones').insert({ project_id: projectId, title: title.trim(), position: milestones?.length ?? 0 })
    await logActivity({ projectId, action: 'Milestone added', detail: title.trim() })
    setTitle('')
    load()
  }

  async function toggleDone(m) {
    await supabase.from('project_milestones').update({ done: !m.done }).eq('id', m.id)
    load()
  }

  async function removeMilestone(id) {
    await supabase.from('project_milestones').delete().eq('id', id)
    load()
  }

  const doneCount = milestones?.filter((m) => m.done).length ?? 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <TrendingUp size={16} color="var(--text-dim)" />
        <h2 style={{ fontSize: 15, margin: 0 }}>Progress</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span>Overall completion</span>
          <strong>{percent}%</strong>
        </div>
        <input type="range" min="0" max="100" value={percent} onChange={(e) => updatePercent(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Milestones {milestones ? `(${doneCount}/${milestones.length})` : ''}</h3>
      </div>

      {milestones?.length === 0 && <EmptyState title="No milestones yet" description="Break progress into checkable steps." />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
        {milestones?.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <input type="checkbox" checked={m.done} onChange={() => toggleDone(m)} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: m.done ? 'line-through' : 'none', color: m.done ? 'var(--text-faint)' : 'var(--text)' }}>{m.title}</span>
            <button className="icon-btn" onClick={() => removeMilestone(m.id)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <form onSubmit={addMilestone} style={{ display: 'flex', gap: 8 }}>
        <input style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a milestone…" />
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> Add</button>
      </form>
    </div>
  )
}
