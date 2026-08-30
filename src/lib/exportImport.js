import JSZip from 'jszip'
import { supabase } from './supabaseClient'
import { logActivity } from './activity'

const BUCKET = 'project-files'
const MANIFEST_VERSION = 1

/**
 * Exports a project as a downloadable .zip: manifest.json (project metadata,
 * urls, apis, github info, database notes, ai usage, notes) plus a /files
 * folder with the actual file bytes. Secrets are NEVER included, even as
 * metadata — this is a hard rule, not a toggle.
 */
export async function exportProject(projectId) {
  const [
    { data: project },
    { data: urls },
    { data: apis },
    { data: github },
    { data: database },
    { data: aiUsage },
    { data: notes },
    { data: files }
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('urls').select('*').eq('project_id', projectId),
    supabase.from('apis').select('id, name, base_url, endpoint, method, auth_type, headers, parameters, description, documentation_url, environment').eq('project_id', projectId),
    supabase.from('github_repositories').select('repository_url, default_branch, github_account, organization, actions_notes, deployment_notes').eq('project_id', projectId).maybeSingle(),
    supabase.from('databases').select('provider, database_url, project_ref, schema_notes, rls_notes, edge_functions_notes, notes').eq('project_id', projectId).maybeSingle(),
    supabase.from('ai_usage').select('provider, account_label, purpose, used_at, notes').eq('project_id', projectId),
    supabase.from('notes').select('title, body, created_at').eq('project_id', projectId),
    supabase.from('files').select('*').eq('project_id', projectId)
  ])

  const zip = new JSZip()
  const manifest = {
    manifestVersion: MANIFEST_VERSION,
    exportedAt: new Date().toISOString(),
    project: project && {
      name: project.name, description: project.description, status: project.status,
      category: project.category, tech_stack: project.tech_stack, repository_url: project.repository_url,
      production_url: project.production_url, development_url: project.development_url,
      hosting_provider: project.hosting_provider, database_provider: project.database_provider
    },
    urls: urls ?? [],
    apis: apis ?? [],
    github: github ?? null,
    database: database ?? null,
    aiUsage: aiUsage ?? [],
    notes: notes ?? [],
    files: (files ?? []).map((f) => ({ name: f.name, size: f.size, mime_type: f.mime_type, path: `files/${f.id}-${f.name}` }))
  }

  // Bundle the actual file bytes alongside the manifest.
  for (const f of files ?? []) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(f.storage_path)
      if (!error && data) zip.file(`files/${f.id}-${f.name}`, data)
    } catch {
      // Skip a file that fails to download rather than failing the whole export.
    }
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  const blob = await zip.generateAsync({ type: 'blob' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  await logActivity({ projectId, action: 'Project exported' })
}

/**
 * Imports a previously exported .zip as a brand-new project (never
 * overwrites an existing one). Secrets are never part of an export, so
 * there is nothing secret-related to import either.
 */
export async function importProject(file, ownerId) {
  const zip = await JSZip.loadAsync(file)
  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('invalid_bundle')
  const manifest = JSON.parse(await manifestFile.async('string'))
  if (!manifest.project?.name) throw new Error('invalid_bundle')

  const slug = manifest.project.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)

  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .insert({ ...manifest.project, slug, owner_id: ownerId, status: manifest.project.status ?? 'Planning' })
    .select()
    .single()
  if (projectErr) throw projectErr

  const projectId = project.id

  if (Array.isArray(manifest.urls) && manifest.urls.length) {
    await supabase.from('urls').insert(manifest.urls.map(({ id, project_id, created_at, updated_at, ...rest }) => ({ ...rest, project_id: projectId })))
  }
  if (Array.isArray(manifest.apis) && manifest.apis.length) {
    await supabase.from('apis').insert(manifest.apis.map(({ id, ...rest }) => ({ ...rest, project_id: projectId })))
  }
  if (manifest.github) {
    await supabase.from('github_repositories').insert({ ...manifest.github, project_id: projectId })
  }
  if (manifest.database) {
    await supabase.from('databases').insert({ ...manifest.database, project_id: projectId })
  }
  if (Array.isArray(manifest.aiUsage) && manifest.aiUsage.length) {
    await supabase.from('ai_usage').insert(manifest.aiUsage.map((r) => ({ ...r, project_id: projectId })))
  }
  if (Array.isArray(manifest.notes) && manifest.notes.length) {
    await supabase.from('notes').insert(manifest.notes.map(({ created_at, ...rest }) => ({ ...rest, project_id: projectId, created_by: ownerId })))
  }

  // Re-upload bundled files under the new project's storage path.
  for (const fileEntry of manifest.files ?? []) {
    const zipEntry = zip.file(fileEntry.path)
    if (!zipEntry) continue
    const blob = await zipEntry.async('blob')
    const storagePath = `${projectId}/${crypto.randomUUID()}-${fileEntry.name}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, blob, { contentType: fileEntry.mime_type || undefined })
    if (!upErr) {
      await supabase.from('files').insert({
        project_id: projectId, storage_path: storagePath, name: fileEntry.name,
        size: fileEntry.size, mime_type: fileEntry.mime_type, owner_id: ownerId
      })
    }
  }

  await logActivity({ projectId, action: 'Project imported' })
  return project
}
