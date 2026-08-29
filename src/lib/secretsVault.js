import { supabase } from './supabaseClient'

async function invoke(action, payload) {
  const { data, error } = await supabase.functions.invoke('secrets-vault', { body: { action, ...payload } })
  if (error) throw error
  return data
}

export const secretsVault = {
  create: (projectId, value, metadata) => invoke('create', { projectId, value, metadata }),
  updateValue: (secretId, value) => invoke('update_value', { secretId, value }),
  reveal: (secretId) => invoke('reveal', { secretId })
}
