import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Share2, Download } from 'lucide-react'
import { exportProject } from '../lib/exportImport'
import { useToast } from '../lib/ToastContext'
import { supabase } from '../lib/supabaseClient'
import Overview from '../components/project/Overview'
import FilesPanel from '../components/project/FilesPanel'
import UrlsPanel from '../components/project/UrlsPanel'
import SecretsPanel from '../components/project/SecretsPanel'
import ApisPanel from '../components/project/ApisPanel'
import GithubPanel from '../components/project/GithubPanel'
import DatabasePanel from '../components/project/DatabasePanel'
import AiToolsPanel from '../components/project/AiToolsPanel'
import NotesPanel from '../components/project/NotesPanel'
import ActivityPanel from '../components/project/ActivityPanel'
import TeamPanel from '../components/project/TeamPanel'
import ShareModal from '../components/project/ShareModal'

const TABS = ['Overview', 'Files', 'URLs', 'Secrets', 'APIs', 'GitHub', 'Database', 'AI', 'Notes', 'Team', 'Activity']

export default function ProjectDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const [project, setProject] = useState(null)
  const [stats, setStats] = useState({ files: null, secrets: null, urls: null, apis: null })
  const [shareOpen, setShareOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { push } = useToast()
  const tab = params.get('tab') || 'Overview'

  async function load() {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(data)
    const [{ count: files }, { count: secrets }, { count: urls }, { count: apis }] = await Promise.all([
      supabase.from('files').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('secrets').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('urls').select('*', { count: 'exact', head: true }).eq('project_id', id),
      supabase.from('apis').select('*', { count: 'exact', head: true }).eq('project_id', id)
    ])
    setStats({ files, secrets, urls, apis })
  }

  useEffect(() => { load() }, [id])

  async function doExport() {
    setExporting(true)
    try {
      await exportProject(id)
      push('Export downloaded', 'success')
    } catch {
      push('Export failed.', 'danger')
    }
    setExporting(false)
  }

  if (!project) return <p style={{ color: 'var(--text-faint)' }}>Loading…</p>

  return (
    <div>
      <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
        <ChevronLeft size={14} /> Projects
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>{project.name}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={doExport} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShareOpen(true)}>
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>

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
      {tab === 'APIs' && <ApisPanel projectId={id} />}
      {tab === 'GitHub' && <GithubPanel projectId={id} />}
      {tab === 'Database' && <DatabasePanel projectId={id} onSwitchTab={(t) => setParams({ tab: t })} />}
      {tab === 'AI' && <AiToolsPanel projectId={id} />}
      {tab === 'Notes' && <NotesPanel projectId={id} />}
      {tab === 'Team' && <TeamPanel projectId={id} ownerId={project.owner_id} />}
      {tab === 'Activity' && <ActivityPanel projectId={id} />}

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} projectId={id} />
    </div>
  )
}
