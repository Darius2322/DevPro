import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Laptop, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import Avatar from './ui/Avatar'

export default function AccountMenu() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const items = [
    { label: 'Profile', icon: User, run: () => navigate('/profile') },
    { label: 'Devices', icon: Laptop, run: () => navigate('/devices') },
    { label: 'Sign out', icon: LogOut, run: () => signOut() }
  ]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        style={{ background: 'none', border: 'none', padding: 2, borderRadius: '50%', display: 'flex' }}
      >
        <Avatar name={profile?.full_name} email={user?.email} size={30} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 950 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute', right: 0, top: '110%', width: 200,
              background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 960, overflow: 'hidden'
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || 'Your account'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
            {items.map(({ label, icon: Icon, run }) => (
              <button
                key={label}
                onClick={() => { setOpen(false); run() }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, textAlign: 'left' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-raised)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <Icon size={15} color="var(--text-dim)" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
