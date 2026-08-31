import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Link2, KeyRound, Settings, LogOut, ShieldCheck,
  Bot, Plug, FolderOpen, MoreHorizontal, X, Clock, Laptop
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import CommandPalette from './CommandPalette'
import NotificationsBell from './NotificationsBell'
import GlobalSearchButton from './GlobalSearchButton'
import ThemeToggle from './ThemeToggle'
import AccountMenu from './AccountMenu'

const PRIMARY_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/urls', label: 'URLs', icon: Link2 },
  { to: '/secrets', label: 'Secrets', icon: KeyRound }
]

const SECONDARY_NAV = [
  { to: '/ai-accounts', label: 'AI', icon: Bot },
  { to: '/connections', label: 'Connections', icon: Plug },
  { to: '/materials', label: 'Materials', icon: FolderOpen },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/devices', label: 'Devices', icon: Laptop },
  { to: '/settings', label: 'Settings', icon: Settings }
]

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV]

function sidebarLinkStyle({ isActive }) {
  return {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6,
    color: isActive ? 'var(--text)' : 'var(--text-dim)',
    background: isActive ? 'var(--surface-raised)' : 'transparent',
    fontSize: 13, fontWeight: 500
  }
}

export default function Layout() {
  const { signOut } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <aside
        className="scrollbar-thin"
        style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}
        data-desktop-only
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 20px' }}>
          <ShieldCheck size={18} color="var(--vault)" />
          <strong style={{ fontSize: 14 }}>DevPro</strong>
        </div>
        {ALL_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} style={sidebarLinkStyle}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>
          Press <kbd style={{ border: '1px solid var(--border-strong)', borderRadius: 4, padding: '1px 5px' }}>⌘K</kbd> for commands
        </div>
      </aside>

      <CommandPalette />

      <main className="scrollbar-thin" style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 72 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, padding: '12px 16px 0', flexWrap: 'wrap' }}>
          <GlobalSearchButton />
          <ThemeToggle />
          <NotificationsBell />
          <AccountMenu />
        </div>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 16px 40px' }}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        data-mobile-only
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around',
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: '6px 4px calc(6px + env(safe-area-inset-bottom))'
        }}
      >
        {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 10px',
              color: isActive ? 'var(--accent)' : 'var(--text-faint)', fontSize: 10, minWidth: 56
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 10px', color: 'var(--text-faint)', fontSize: 10, minWidth: 56, background: 'none', border: 'none' }}
        >
          <MoreHorizontal size={18} />
          More
        </button>
      </nav>

      {/* Mobile "More" drawer */}
      {moreOpen && (
        <div
          data-mobile-only
          onMouseDown={(e) => e.target === e.currentTarget && setMoreOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,12,0.6)', zIndex: 1000 }}
        >
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', borderRadius: '16px 16px 0 0', padding: '16px 12px calc(16px + env(safe-area-inset-bottom))', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
              <strong style={{ fontSize: 15 }}>More</strong>
              <button className="icon-btn" onClick={() => setMoreOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to} to={to} onClick={() => setMoreOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10,
                    background: isActive ? 'var(--surface-raised)' : 'var(--bg)', border: '1px solid var(--border)',
                    color: isActive ? 'var(--text)' : 'var(--text-dim)', fontSize: 14, fontWeight: 500
                  })}
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
            <button
              className="btn-danger"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16 }}
              onClick={signOut}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}

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
