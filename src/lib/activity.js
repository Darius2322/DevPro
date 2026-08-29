import { supabase } from './supabaseClient'

/**
 * Records an activity log entry. `detail` must be safe, non-sensitive
 * summary text — never pass secret values, tokens, or file contents here.
 */
export async function logActivity({ projectId, action, detail }) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return
  await supabase.from('activity_logs').insert({
    project_id: projectId ?? null,
    user_id: userId,
    action,
    detail: detail ?? null
  })
}
