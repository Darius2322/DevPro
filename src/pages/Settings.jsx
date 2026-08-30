import { useEffect, useState } from 'react'
import { Laptop } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { currentDeviceId } from '../lib/deviceTracking'
import MfaSection from '../components/MfaSection'

export default function Settings() {
  const { user, signOutAllDevices } = useAuth()
  const { push } = useToast()
  const [devices, setDevices] = useState(null)

  useEffect(() => {
    supabase.from('devices').select('*').order('last_seen_at', { ascending: false }).then(({ data }) => setDevices(data ?? []))
  }, [])

  async function forgetDevice(id) {
    await supabase.from('devices').delete().eq('id', id)
    setDevices((d) => d.filter((x) => x.id !== id))
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Settings</h1>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Account</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{user?.email}</p>
      </section>

      <MfaSection />

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Laptop size={15} color="var(--text-dim)" /> Devices
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
          Devices that have signed in. This is a log of what's signed in — same account works on any device
          automatically, there's no separate "linking" step. Removing an entry here only clears it from this
          list; it doesn't force that device to sign out (use "Sign out of all devices" below for that).
        </p>
        {devices?.map((d) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <div>
              {d.label || 'Unknown device'}
              {d.device_id === currentDeviceId() && <span style={{ color: 'var(--accent)', fontSize: 11 }}> · this device</span>}
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Last seen {new Date(d.last_seen_at).toLocaleString()}</div>
            </div>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => forgetDevice(d.id)}>Forget</button>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Security</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
          Sign out everywhere if you suspect a device or session has been compromised. Unlike the device list
          above, this actually invalidates every signed-in session right now.
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
