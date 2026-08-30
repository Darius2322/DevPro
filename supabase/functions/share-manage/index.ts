// Supabase Edge Function: share-manage
//
// Two audiences hit this function:
//  - Signed-in project members: action "create" / "revoke" (JWT required)
//  - Anonymous visitors following a share link: action "view" (no JWT —
//    access is instead gated by the token + optional password, checked here)
//
// Secrets and Notes are never included in a share, period — there is no
// parameter that can turn them on. The service-role key never leaves this
// function.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function hashPassword(password: string, saltB64?: string) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256)
  return {
    hash: btoa(String.fromCharCode(...new Uint8Array(bits))),
    salt: btoa(String.fromCharCode(...salt))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    const body = await req.json()
    const { action } = body

    if (action === 'view') {
      const { token, password } = body
      const { data: share, error } = await admin.from('shares').select('*').eq('token', token).single()
      if (error || !share) return json({ error: 'Not found' }, 404)
      if (share.revoked) return json({ error: 'This link has been revoked.' }, 410)
      if (share.expires_at && new Date(share.expires_at) < new Date()) return json({ error: 'This link has expired.' }, 410)

      if (share.password_hash) {
        if (!password) return json({ requiresPassword: true }, 401)
        const { hash } = await hashPassword(password, share.password_salt)
        if (hash !== share.password_hash) return json({ requiresPassword: true, error: 'Incorrect password' }, 401)
      }

      const { data: project } = await admin.from('projects').select('name, description, status, tech_stack, repository_url, production_url, created_at').eq('id', share.project_id).single()
      const result: Record<string, unknown> = { project }

      if (share.include_files) {
        const { data } = await admin.from('files').select('name, size, mime_type, created_at').eq('project_id', share.project_id)
        result.files = data
      }
      if (share.include_urls) {
        const { data } = await admin.from('urls').select('name, url, type, environment').eq('project_id', share.project_id)
        result.urls = data
      }
      if (share.include_apis) {
        const { data } = await admin.from('apis').select('name, base_url, endpoint, method, environment, description, documentation_url').eq('project_id', share.project_id)
        result.apis = data
      }
      return json(result)
    }

    // Everything below requires a signed-in project member.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return json({ error: 'Missing authorization' }, 401)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt)
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401)
    const userId = userData.user.id

    async function assertProjectAccess(pid: string) {
      const { data: member } = await admin.from('project_members').select('role').eq('project_id', pid).eq('user_id', userId).maybeSingle()
      const { data: project } = await admin.from('projects').select('owner_id').eq('id', pid).single()
      if (!member && project?.owner_id !== userId) throw new Error('forbidden')
    }

    if (action === 'create') {
      const { projectId, sections, password, expiresInDays } = body
      await assertProjectAccess(projectId)
      const token = crypto.randomUUID().replace(/-/g, '')
      let password_hash = null, password_salt = null
      if (password) {
        const h = await hashPassword(password)
        password_hash = h.hash
        password_salt = h.salt
      }
      const expires_at = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null
      const { data, error } = await admin
        .from('shares')
        .insert({
          project_id: projectId,
          created_by: userId,
          include_overview: sections?.overview ?? true,
          include_files: sections?.files ?? false,
          include_urls: sections?.urls ?? false,
          include_apis: sections?.apis ?? false,
          password_hash,
          password_salt,
          expires_at,
          token
        })
        .select('id, token, expires_at')
        .single()
      if (error) throw error
      return json({ data })
    }

    if (action === 'revoke') {
      const { shareId } = body
      const { data: share } = await admin.from('shares').select('project_id').eq('id', shareId).single()
      await assertProjectAccess(share.project_id)
      await admin.from('shares').update({ revoked: true }).eq('id', shareId)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    const message = err instanceof Error && err.message === 'forbidden' ? 'Forbidden' : 'Request failed'
    return json({ error: message }, message === 'Forbidden' ? 403 : 400)
  }
})
