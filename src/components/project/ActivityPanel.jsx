import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { EmptyState } from '../ui/Primitives'

const FILTERS = ['All', 'Files', 'Secrets', 'URLs', 'APIs', 'GitHub', 'Database', 'AI', 'Notes']

function matchesFilter(action, filter) {
  if (filter === 'All') return true
  const map = {
    Files: 'file', Secrets: 'secret', URLs: 'url', APIs: 'api', GitHub: 'github',
    Database: 'database', AI: /chatgpt|claude|gemini|copilot|cursor|replit|ai /i, Notes: 'note'
  }
  const needle = map[filter]
  return needle instanceof RegExp ? needle.test(action) : action.toLowerCase().includes(needle)
}

export default function ActivityPanel({ projectId }) {
  const [logs, setLogs] = useState(null)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    supabase
      .from('activity_logs')
      .select('id, action, detail, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setLogs(data ?? []))
  }, [projectId])

  const filtered = logs?.filter((l) => matchesFilter(l.action, filter)) ?? []

  // Group by day for a simple timeline layout.
  const groups = filtered.reduce((acc, l) => {
    const day = new Date(l.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    acc[day] = acc[day] || []
    acc[day].push(l)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Activity</h2>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={f === filter ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <EmptyState title="No activity yet" description="Actions across this project will show up here as a timeline." />}

      {Object.entries(groups).map(([day, entries]) => (
        <div key={day} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, marginBottom: 6 }}>{day}</div>
          {entries.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <Clock size={13} color="var(--text-faint)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ fontWeight: 500 }}>{l.action}</strong>
                {l.detail && <span style={{ color: 'var(--text-dim)' }}> — {l.detail}</span>}
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
