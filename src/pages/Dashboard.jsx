import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, Link2, KeyRound, Clock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ background: 'var(--surface-raised)', borderRadius: 8, padding: 8 }}>
        <Icon size={18} color="var(--accent)" />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ projects: null, urls: null, secrets: null, files: null })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ count: projects }, { count: urls }, { count: secrets }, { count: files }, { data: activity }] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).is('archived_at', null),
        supabase.from('urls').select('*', { count: 'exact', head: true }),
        supabase.from('secrets').select('*', { count: 'exact', head: true }),
        supabase.from('files').select('*', { count: 'exact', head: true }),
        supabase.from('activity_logs').select('id, action, detail, created_at, project_id, projects(name)').order('created_at', { ascending: false }).limit(8)
      ])
      if (cancelled) return
      setCounts({ projects, urls, secrets, files })
      setRecent(activity ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const quickActions = [
    { label: 'New Project', icon: FolderKanban, to: '/projects?new=1' },
    { label: 'Add URL', icon: Link2, to: '/urls?new=1' },
    { label: 'Add Secret', icon: KeyRound, to: '/secrets?new=1' }
  ]

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: 0, marginBottom: 24 }}>Your projects and resources at a glance.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Active projects" value={loading ? undefined : counts.projects} icon={FolderKanban} />
        <StatCard label="URLs tracked" value={loading ? undefined : counts.urls} icon={Link2} />
        <StatCard label="Secrets stored" value={loading ? undefined : counts.secrets} icon={KeyRound} />
        <StatCard label="Files stored" value={loading ? undefined : counts.files} icon={FolderKanban} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {quickActions.map((a) => (
          <button key={a.label} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate(a.to)}>
            <Plus size={14} /> {a.label}
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: 15, marginBottom: 10 }}>Recent activity</h2>
      {recent.length === 0 && !loading && (
        <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Nothing yet — activity will show up here as you work.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {recent.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <Clock size={14} color="var(--text-faint)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div>
                <strong style={{ fontWeight: 500 }}>{r.action}</strong>
                {r.detail ? <span style={{ color: 'var(--text-dim)' }}> — {r.detail}</span> : null}
                {r.projects?.name ? <span style={{ color: 'var(--text-faint)' }}> · {r.projects.name}</span> : null}
              </div>
              <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
