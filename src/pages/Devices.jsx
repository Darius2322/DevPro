import { useEffect, useState } from 'react'
import { Laptop, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { currentDeviceId } from '../lib/deviceTracking'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { EmptyState } from '../components/ui/Primitives'

export default function Devices() {
  const { signOutAllDevices } = useAuth()
  const { push } = useToast()
  const [devices, setDevices] = useState(null)

  async function load() {
    const { data } = await supabase.from('devices').select('*').order('last_seen_at', { ascending: false })
    setDevices(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function forget(id) {
    await supabase.from('devices').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Devices</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: 4, marginBottom: 8 }}>
        Devices that have signed in to this account. Since it's the same login everywhere, your phone and
        desktop already share the same account automatically — nothing to link.
      </p>
      <p style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 0, marginBottom: 20 }}>
        This list is informational — removing an entry just clears it from view, it doesn't sign that device
        out. To actually revoke every active session right now, use "Sign out of all devices" below.
      </p>

      {devices?.length === 0 && <EmptyState title="No devices recorded yet" description="Devices show up here the next time you sign in from them." />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
        {devices?.map((d) => (
          <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Laptop size={16} color="var(--text-faint)" />
              <div>
                <div style={{ fontSize: 13 }}>
                  {d.label || 'Unknown device'}
                  {d.device_id === currentDeviceId() && <span style={{ color: 'var(--accent)', fontSize: 11 }}> · this device</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Last seen {new Date(d.last_seen_at).toLocaleString()}</div>
              </div>
            </div>
            <button className="icon-btn" onClick={() => forget(d.id)} title="Forget"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <button
        className="btn-danger"
        onClick={async () => {
          await signOutAllDevices()
          push('Signed out of all devices')
        }}
      >
        Sign out of all devices
      </button>
    </div>
  )
}
