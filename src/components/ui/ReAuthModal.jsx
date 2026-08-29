import { useState } from 'react'
import { Modal } from './Primitives'
import { useAuth } from '../../lib/AuthContext'

export default function ReAuthModal({ open, onClose, onConfirmed, title = 'Confirm your password' }) {
  const { user, signIn } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signIn(user.email, password)
    setBusy(false)
    if (error) {
      setError('Incorrect password.')
      return
    }
    setPassword('')
    onConfirmed()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width={360}>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 0 }}>This is a sensitive action. Re-enter your password to continue.</p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Password</label>
          <input type="password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -6 }}>{error}</p>}
        <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Confirming…' : 'Confirm'}</button>
      </form>
    </Modal>
  )
}
