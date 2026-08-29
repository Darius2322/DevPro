import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'

export default function Settings() {
  const { user, signOutAllDevices } = useAuth()
  const { push } = useToast()
  const [theme, setTheme] = useState(localStorage.getItem('vault-theme') || 'system')

  useEffect(() => {
    localStorage.setItem('vault-theme', theme)
  }, [theme])

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Settings</h1>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Account</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{user?.email}</p>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Security</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
          Sign out everywhere if you suspect a device or session has been compromised.
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
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Theme</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light (not yet implemented)</option>
          </select>
        </div>
      </section>
    </div>
  )
}
