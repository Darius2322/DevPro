// Supabase Edge Function: secrets-vault
//
// This function is the ONLY place secret values are ever encrypted or
// decrypted. The browser never holds the encryption key or the service-role
// key — it only ever sends/receives plaintext for the single secret the
// signed-in user is authorized to read or write, over HTTPS, for one request.
//
// Deploy with:
//   supabase functions deploy secrets-vault
//   supabase secrets set SECRETS_ENCRYPTION_KEY=$(openssl rand -base64 32)
//
// Required env vars (set automatically by Supabase for SUPABASE_*):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SECRETS_ENCRYPTION_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RAW_KEY = Deno.env.get('SECRETS_ENCRYPTION_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

async function getAesKey() {
  const keyBytes = Uint8Array.from(atob(RAW_KEY), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptValue(plaintext: string) {
  const key = await getAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuf))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

async function decryptValue(ciphertextB64: string, ivB64: string) {
  const key = await getAesKey()
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const cipherBuf = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0))
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf)
  return new TextDecoder().decode(plainBuf)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return json({ error: 'Missing authorization' }, 401)

    // Client used to resolve *who* is calling, scoped to their own JWT.
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt)
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401)
    const userId = userData.user.id

    // Service-role client used only for the authorized read/write itself,
    // AFTER we've confirmed the user has access to the project below.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const body = await req.json()
    const { action, secretId, projectId, value, metadata } = body

    async function assertProjectAccess(pid: string) {
      const { data: member } = await admin
        .from('project_members')
        .select('role')
        .eq('project_id', pid)
        .eq('user_id', userId)
        .maybeSingle()
      const { data: project } = await admin.from('projects').select('owner_id').eq('id', pid).single()
      if (!member && project?.owner_id !== userId) throw new Error('forbidden')
    }

    if (action === 'create') {
      await assertProjectAccess(projectId)
      const { ciphertext, iv } = await encryptValue(value)
      const { data, error } = await admin
        .from('secrets')
        .insert({ ...metadata, project_id: projectId, encrypted_value: ciphertext, iv, created_by: userId })
        .select('id, name, type, project_id, environment, description, expires_at, created_at, updated_at')
        .single()
      if (error) throw error
      return json({ data })
    }

    if (action === 'update_value') {
      const { data: existing } = await admin.from('secrets').select('project_id').eq('id', secretId).single()
      await assertProjectAccess(existing.project_id)
      const { ciphertext, iv } = await encryptValue(value)
      const { error } = await admin.from('secrets').update({ encrypted_value: ciphertext, iv, rotated_at: new Date().toISOString() }).eq('id', secretId)
      if (error) throw error
      return json({ ok: true })
    }

    if (action === 'reveal') {
      const { data: secret, error } = await admin.from('secrets').select('project_id, encrypted_value, iv').eq('id', secretId).single()
      if (error) throw error
      await assertProjectAccess(secret.project_id)
      const plaintext = await decryptValue(secret.encrypted_value, secret.iv)
      await admin.from('secrets').update({ last_accessed_at: new Date().toISOString() }).eq('id', secretId)
      await admin.from('activity_logs').insert({ project_id: secret.project_id, user_id: userId, action: 'Secret revealed', detail: null })
      return json({ value: plaintext })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    const message = err instanceof Error && err.message === 'forbidden' ? 'Forbidden' : 'Request failed'
    const status = message === 'Forbidden' ? 403 : 400
    return json({ error: message }, status)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
