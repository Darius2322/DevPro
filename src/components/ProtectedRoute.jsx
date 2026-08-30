import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { mfa } from '../lib/mfa'
import MfaChallenge from './MfaChallenge'

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const [mfaState, setMfaState] = useState('checking') // 'checking' | 'ok' | 'required'
  const [factorId, setFactorId] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    mfa.getAssuranceLevel().then(async ({ data }) => {
      if (cancelled) return
      if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
        const { data: factors } = await mfa.listFactors()
        const verified = factors?.totp?.find((f) => f.status === 'verified')
        setFactorId(verified?.id ?? null)
        setMfaState('required')
      } else {
        setMfaState('ok')
      }
    })
    return () => { cancelled = true }
  }, [user?.id])

  if (loading || (user && mfaState === 'checking')) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (mfaState === 'required' && factorId) {
    return <MfaChallenge factorId={factorId} onVerified={() => setMfaState('ok')} />
  }

  // profile can briefly be null right after sign-in while it's still
  // loading — only redirect once we actually know it's incomplete.
  if (profile && profile.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
