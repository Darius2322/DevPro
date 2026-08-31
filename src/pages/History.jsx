import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { EmptyState, Badge } from '../components/ui/Primitives'

export default function History() {
  const [logs, setLogs] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase
      .from('activity_logs')
      .select('id, action, detail, created_at, project_id, projects(name)')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => setLogs(data ?? []))
  }, [])

  const projectOptions = logs ? [...new Map(logs.filter((l) => l.projects).map((l) => [l.project_id, l.projects.name])).entries()] : []
  const filtered = logs?.filter((l) => filter === 'all' || l.project_id === filter) ?? []

  const groups = filtered.reduce((acc, l) => {
    const day = new Date(l.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    acc[day] = acc[day] || []
    acc[day].push(l)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>History</h1>
        {projectOptions.length > 0 && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12 }}>
            <option value="all">All projects</option>
            {projectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 4, marginBottom: 20 }}>Everything that's happened across all your projects.</p>

      {filtered.length === 0 && <EmptyState title="No activity yet" description="Actions across your projects will show up here." />}

      {Object.entries(groups).map(([day, entries]) => (
        <div key={day} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, marginBottom: 6 }}>{day}</div>
          {entries.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <Clock size={13} color="var(--text-faint)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ fontWeight: 500 }}>{l.action}</strong>
                {l.detail && <span style={{ color: 'var(--text-dim)' }}> — {l.detail}</span>}
                {l.projects?.name && (
                  <Link to={`/projects/${l.project_id}`} style={{ marginLeft: 6 }}>
                    <Badge>{l.projects.name}</Badge>
                  </Link>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
