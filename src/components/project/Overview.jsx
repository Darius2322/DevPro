import { ExternalLink } from 'lucide-react'
import { Badge } from '../ui/Primitives'

const STATUS_TONE = { Planning: 'planning', Active: 'active', Paused: 'paused', Completed: 'default', Archived: 'archived' }

export default function Overview({ project, stats }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Badge tone={STATUS_TONE[project.status] ?? 'default'}>{project.status}</Badge>
        {project.tech_stack && <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{project.tech_stack}</span>}
      </div>
      <p style={{ color: 'var(--text-dim)', maxWidth: 560 }}>{project.description || 'No description yet.'}</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {project.repository_url && (
          <a href={project.repository_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            GitHub <ExternalLink size={12} />
          </a>
        )}
        {project.production_url && (
          <a href={project.production_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            Production <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
        {[
          ['Files', stats.files],
          ['Secrets', stats.secrets],
          ['URLs', stats.urls],
          ['APIs', stats.apis]
        ].map(([label, value]) => (
          <div key={label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{value ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-faint)' }}>
        Created {new Date(project.created_at).toLocaleDateString()} · Last updated {new Date(project.updated_at).toLocaleDateString()}
      </p>
    </div>
  )
}
