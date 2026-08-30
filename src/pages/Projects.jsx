import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Plus, Search, Archive, Star, Upload } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useRealtimeTable } from '../lib/useRealtimeTable'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { logActivity } from '../lib/activity'
import { importProject } from '../lib/exportImport'
import { Badge, EmptyState, Modal } from '../components/ui/Primitives'

const STATUS_TONE = { Planning: 'planning', Active: 'active', Paused: 'paused', Completed: 'default', Archived: 'archived' }

export default function Projects() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const [projects, setProjects] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [modalOpen, setModalOpen] = useState(params.get('new') === '1')
  const [form, setForm] = useState({ name: '', description: '', status: 'Planning', tech_stack: '', repository_url: '', production_url: '' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef(null)

  async function load() {
    let q = supabase.from('projects').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false })
    if (!showArchived) q = q.is('archived_at', null)
    const { data, error } = await q
    if (!error) setProjects(data)
  }

  useEffect(() => { load() }, [showArchived])
  useRealtimeTable('projects', null, load)

  const filtered = useMemo(() => {
    if (!projects) return []
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (query && !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [projects, statusFilter, query])

  async function createProject(e) {
    e.preventDefault()
    setSaving(true)
    const slug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...form, slug, owner_id: user.id })
      .select()
      .single()
    setSaving(false)
    if (error) {
      push('Could not create project.', 'danger')
      return
    }
    await logActivity({ projectId: data.id, action: 'Project created', detail: data.name })
    push('Project created', 'success')
    setModalOpen(false)
    params.delete('new')
    setParams(params)
    navigate(`/projects/${data.id}`)
  }

  async function togglePin(p) {
    await supabase.from('projects').update({ pinned: !p.pinned }).eq('id', p.id)
    load()
  }

  async function doImport(file) {
    setImporting(true)
    try {
      const project = await importProject(file, user.id)
      push('Project imported', 'success')
      navigate(`/projects/${project.id}`)
    } catch {
      push('Could not import — check the file is a valid export.', 'danger')
    }
    setImporting(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>Projects</h1>
          <p style={{ color: 'var(--text-dim)', margin: '4px 0 0' }}>Everything you're building, organized by project.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => importInputRef.current?.click()} disabled={importing}>
            <Upload size={14} /> {importing ? 'Importing…' : 'Import'}
          </button>
          <input ref={importInputRef} type="file" accept=".zip" hidden onChange={(e) => e.target.files[0] && doImport(e.target.files[0])} />
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setModalOpen(true)}>
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-faint)' }} />
          <input
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 30, background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '8px 10px 8px 30px', color: 'var(--text)' }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)' }}>
          <option value="all">All statuses</option>
          {['Planning', 'Active', 'Paused', 'Completed', 'Archived'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowArchived((v) => !v)}>
          <Archive size={14} /> {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      </div>

      {projects === null && <p style={{ color: 'var(--text-faint)' }}>Loading…</p>}

      {projects !== null && filtered.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start organizing your development resources."
          action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Create Project</button>}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {filtered.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Link to={`/projects/${p.id}`} style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{p.name}</Link>
              <button className="icon-btn" onClick={() => togglePin(p)} aria-label={p.pinned ? 'Unpin' : 'Pin'}>
                <Star size={14} fill={p.pinned ? 'var(--vault)' : 'none'} color={p.pinned ? 'var(--vault)' : 'currentColor'} />
              </button>
            </div>
            <Badge tone={STATUS_TONE[p.status] ?? 'default'}>{p.status}</Badge>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0, minHeight: 32 }}>{p.description || 'No description yet.'}</p>
            {p.tech_stack && <p style={{ color: 'var(--text-faint)', fontSize: 12, margin: 0 }}>{p.tech_stack}</p>}
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Project">
        <form onSubmit={createProject}>
          <div className="field">
            <label>Name</label>
            <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['Planning', 'Active', 'Paused', 'Completed'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Technology stack</label>
            <input placeholder="React, Supabase, Vercel" value={form.tech_stack} onChange={(e) => setForm({ ...form, tech_stack: e.target.value })} />
          </div>
          <div className="field">
            <label>Repository URL</label>
            <input value={form.repository_url} onChange={(e) => setForm({ ...form, repository_url: e.target.value })} />
          </div>
          <div className="field">
            <label>Production URL</label>
            <input value={form.production_url} onChange={(e) => setForm({ ...form, production_url: e.target.value })} />
          </div>
          <button className="btn-primary" style={{ width: '100%' }} disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button>
        </form>
      </Modal>
    </div>
  )
}
