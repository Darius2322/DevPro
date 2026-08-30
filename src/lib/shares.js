import { supabase } from './supabaseClient'

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke('share-manage', { body })
  if (error) throw error
  return data
}

export const shares = {
  create: (projectId, sections, password, expiresInDays) => invoke({ action: 'create', projectId, sections, password, expiresInDays }),
  revoke: (shareId) => invoke({ action: 'revoke', shareId }),
  view: (token, password) => invoke({ action: 'view', token, password })
}
