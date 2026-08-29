import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Overview from '../components/project/Overview'
import FilesPanel from '../components/project/FilesPanel'
import UrlsPanel from '../components/project/UrlsPanel'
import SecretsPanel from '../components/project/SecretsPanel'

const TABS = ['Overview', 'Files', 'URLs', 'Secrets']

export default function ProjectDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const [project, setProject] = useState(null)
  const [stats, setStats] = useState({ files: null, secrets: null, urls: null })
  const tab = params.get('tab') || 'Overview'

  async function load() {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(data)
    const [{ count: files }, { count: secrets }, { count: urls }] = await Promise.all([
      supabase.from('files').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('secrets').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('urls').select('*', { count: 'exact', head: true }).eq('project_id', id)
    ])
    setStats({ files, secrets, urls })
  }

  useEffect(() => { load() }, [id])

  if (!project) return <p style={{ color: 'var(--text-faint)' }}>Loading…</p>

  return (
    <div>
      <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
        <ChevronLeft size={14} /> Projects
      </Link>
      <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>{project.name}</h1>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setParams({ tab: t })}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              color: tab === t ? 'var(--text)' : 'var(--text-dim)',
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <Overview project={project} stats={stats} />}
      {tab === 'Files' && <FilesPanel projectId={id} />}
      {tab === 'URLs' && <UrlsPanel projectId={id} />}
      {tab === 'Secrets' && <SecretsPanel projectId={id} />}
    </div>
  )
}
