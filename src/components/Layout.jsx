import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, Link2, KeyRound, Settings, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import CommandPalette from './CommandPalette'
import NotificationsBell from './NotificationsBell'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/urls', label: 'URLs', icon: Link2 },
  { to: '/secrets', label: 'Secrets', icon: KeyRound },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export default function Layout() {
  const { signOut, user } = useAuth()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <aside
        className="scrollbar-thin"
        style={{
          width: 220,
          borderRight: '1px solid var(--border)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
        data-desktop-only
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 20px' }}>
          <ShieldCheck size={18} color="var(--vault)" />
          <strong style={{ fontSize: 14 }}>DevPro</strong>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 6,
              color: isActive ? 'var(--text)' : 'var(--text-dim)',
              background: isActive ? 'var(--surface-raised)' : 'transparent',
              fontSize: 13,
              fontWeight: 500
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>
          <div style={{ marginBottom: 8, wordBreak: 'break-all' }}>{user?.email}</div>
          <div style={{ marginBottom: 8, textAlign: 'center' }}>
            Press <kbd style={{ border: '1px solid var(--border-strong)', borderRadius: 4, padding: '1px 5px' }}>⌘K</kbd> for commands
          </div>
          <button className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }} onClick={signOut}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <CommandPalette />

      <main className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px 0' }}>
          <NotificationsBell />
        </div>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 20px 40px' }}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        data-mobile-only
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          padding: '6px 4px calc(6px + env(safe-area-inset-bottom))'
        }}
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 10px',
              color: isActive ? 'var(--accent)' : 'var(--text-faint)',
              fontSize: 10,
              minWidth: 56
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (min-width: 769px) { [data-mobile-only] { display: none; } }
        @media (max-width: 768px) {
          [data-desktop-only] { display: none; }
          main { padding-bottom: 76px; }
        }
      `}</style>
    </div>
  )
}
