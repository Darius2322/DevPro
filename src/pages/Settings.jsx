import { Link } from 'react-router-dom'
import { Laptop } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import MfaSection from '../components/MfaSection'

export default function Settings() {
  const { user, signOutAllDevices } = useAuth()
  const { push } = useToast()

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Settings</h1>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Account</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{user?.email}</p>
      </section>

      <MfaSection />

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Security</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
          See what's signed in on the <Link to="/devices" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Laptop size={13} />Devices page</Link>.
          If you suspect a device or session has been compromised, sign out everywhere — this actually
          invalidates every active session right now.
        </p>
        <button
          className="btn-danger"
          onClick={async () => {
            await signOutAllDevices()
            push('Signed out of all devices')
          }}
        >
          Sign out of all devices
        </button>
      </section>

      <section className="card">
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Appearance</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Use the sun/moon icon in the top bar to switch between light and dark.
        </p>
      </section>
    </div>
  )
}
