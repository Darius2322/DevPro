import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { mfa } from '../lib/mfa'
import { useToast } from '../lib/ToastContext'

export default function MfaSection() {
  const { push } = useToast()
  const [factors, setFactors] = useState(null)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState(null)
  const [pendingFactorId, setPendingFactorId] = useState(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  async function load() {
    const { data } = await mfa.listFactors()
    setFactors(data?.totp ?? [])
  }

  useEffect(() => { load() }, [])

  async function startEnroll() {
    setEnrolling(true)
    const { data, error } = await mfa.enroll()
    if (error) {
      push(error.message || 'Could not start enrollment.', 'danger')
      setEnrolling(false)
      return
    }
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setPendingFactorId(data.id)
  }

  async function verify(e) {
    e.preventDefault()
    setVerifying(true)
    const { error } = await mfa.challengeAndVerify(pendingFactorId, code)
    setVerifying(false)
    if (error) {
      push('Incorrect code — try again.', 'danger')
      return
    }
    push('Two-factor authentication enabled', 'success')
    setEnrolling(false)
    setQrCode(null)
    setSecret(null)
    setPendingFactorId(null)
    setCode('')
    load()
  }

  async function remove(factorId) {
    const { error } = await mfa.unenroll(factorId)
    if (error) return push(error.message || 'Could not remove.', 'danger')
    push('Two-factor authentication removed')
    load()
  }

  const active = factors?.find((f) => f.status === 'verified')

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {active ? <ShieldCheck size={15} color="var(--success)" /> : <ShieldOff size={15} color="var(--text-faint)" />}
        Two-factor authentication
      </h2>

      {active && !enrolling && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Enabled. You'll be asked for a code from your authenticator app on every sign-in.</p>
          <button className="btn-danger" onClick={() => remove(active.id)}>Turn off</button>
        </div>
      )}

      {!active && !enrolling && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Add an extra layer of security using an authenticator app (Google Authenticator, 1Password, Authy, etc.).</p>
          <button className="btn-primary" onClick={startEnroll}>Set up two-factor authentication</button>
        </div>
      )}

      {enrolling && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          {qrCode && (
            <div style={{ background: '#fff', padding: 12, borderRadius: 8, display: 'inline-block', marginBottom: 12 }}
                 dangerouslySetInnerHTML={{ __html: qrCode }} />
          )}
          {secret && (
            <p className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', wordBreak: 'break-all' }}>
              Can't scan? Enter this key manually: {secret}
            </p>
          )}
          <form onSubmit={verify}>
            <div className="field" style={{ maxWidth: 200 }}>
              <label>6-digit code</label>
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" disabled={verifying}>{verifying ? 'Verifying…' : 'Verify & enable'}</button>
              <button type="button" className="btn-ghost" onClick={() => { setEnrolling(false); setQrCode(null); setPendingFactorId(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
