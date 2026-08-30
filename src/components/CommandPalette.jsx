import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FolderPlus, Upload, KeyRound, Link2, LayoutDashboard, FolderKanban, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

export default function CommandPalette() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const commands = useMemo(() => [
    { label: 'Dashboard', icon: LayoutDashboard, run: () => navigate('/') },
    { label: 'New Project', icon: FolderPlus, run: () => navigate('/projects?new=1') },
    { label: 'All Projects', icon: FolderKanban, run: () => navigate('/projects') },
    { label: 'Add URL', icon: Link2, run: () => navigate('/urls?new=1') },
    { label: 'Add Secret', icon: KeyRound, run: () => navigate('/secrets?new=1') },
    { label: 'Upload File (open a project first)', icon: Upload, run: () => navigate('/projects') },
    { label: 'Open Settings', icon: Settings, run: () => navigate('/settings') },
    { label: 'Sign out', icon: LogOut, run: () => signOut() }
  ], [navigate, signOut])

  useEffect(() => {
    function onKey(e) {
      const isK = e.key === 'k' || e.key === 'K'
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (open) setQuery('') }, [open])

  if (!open) return null

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,12,0.6)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
    >
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <Search size={14} color="var(--text-faint)" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text)', fontSize: 14 }}
          />
          <kbd style={{ fontSize: 11, color: 'var(--text-faint)', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '1px 5px' }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }} className="scrollbar-thin">
          {filtered.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--text-faint)' }}>No matching commands</div>}
          {filtered.map((c) => (
            <button
              key={c.label}
              onClick={() => { c.run(); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, textAlign: 'left' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <c.icon size={15} color="var(--text-dim)" />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
