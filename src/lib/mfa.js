import { supabase } from './supabaseClient'

export const mfa = {
  listFactors: () => supabase.auth.mfa.listFactors(),
  enroll: () => supabase.auth.mfa.enroll({ factorType: 'totp' }),
  challengeAndVerify: (factorId, code) => supabase.auth.mfa.challengeAndVerify({ factorId, code }),
  unenroll: (factorId) => supabase.auth.mfa.unenroll({ factorId }),
  getAssuranceLevel: () => supabase.auth.mfa.getAuthenticatorAssuranceLevel()
}
