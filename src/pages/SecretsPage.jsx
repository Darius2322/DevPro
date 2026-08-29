import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import SecretsPanel from '../components/project/SecretsPanel'

export default function SecretsPage() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    supabase.from('projects').select('id, name').is('archived_at', null).order('name').then(({ data }) => setProjects(data ?? []))
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Secrets Vault</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: 0, marginBottom: 20 }}>Every credential across all your projects, encrypted at rest.</p>
      <SecretsPanel projectId={null} projects={projects} />
    </div>
  )
}
