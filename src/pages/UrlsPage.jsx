import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import UrlsPanel from '../components/project/UrlsPanel'

export default function UrlsPage() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    supabase.from('projects').select('id, name').is('archived_at', null).order('name').then(({ data }) => setProjects(data ?? []))
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>URLs</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: 0, marginBottom: 20 }}>Every website, dashboard, and endpoint across all your projects.</p>
      <UrlsPanel projectId={null} projects={projects} />
    </div>
  )
}
