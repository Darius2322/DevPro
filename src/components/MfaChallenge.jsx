import { useState } from 'react'
import { Lock } from 'lucide-react'
import { mfa } from '../lib/mfa'

export default function MfaChallenge({ factorId, onVerified }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await mfa.challengeAndVerify(factorId, code)
    setBusy(false)
    if (error) {
      setError('Incorrect code. Try again.')
      return
    }
    onVerified()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={onSubmit} className="card" style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Lock size={18} color="var(--vault)" />
          <strong>Enter your authenticator code</strong>
        </div>
        <div className="field">
          <input required autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -6 }}>{error}</p>}
        <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Verifying…' : 'Verify'}</button>
      </form>
    </div>
  )
}
