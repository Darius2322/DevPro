import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useRealtimeTable } from '../lib/useRealtimeTable'
import { useAuth } from '../lib/AuthContext'

export default function NotificationsBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  async function load() {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setItems(data ?? [])
  }

  useEffect(() => { load() }, [user?.id])
  useRealtimeTable('notifications', null, load)

  const unread = items.filter((i) => !i.read).length

  async function markAllRead() {
    const unreadIds = items.filter((i) => !i.read).map((i) => i.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    load()
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    load()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications" style={{ position: 'relative' }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--danger)', borderRadius: '50%', width: 8, height: 8 }} />
        )}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 950 }} onClick={() => setOpen(false)} />
          <div
            className="scrollbar-thin"
            style={{
              position: 'absolute', right: 0, top: '110%', width: 320, maxHeight: 420, overflowY: 'auto',
              background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 960
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ fontSize: 13 }}>Notifications</strong>
              {unread > 0 && <button className="icon-btn" style={{ fontSize: 11, width: 'auto', padding: '2px 6px' }} onClick={markAllRead}>Mark all read</button>}
            </div>
            {items.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--text-faint)' }}>You're all caught up.</div>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none',
                  borderBottom: '1px solid var(--border)', background: n.read ? 'none' : 'var(--surface-raised)', color: 'var(--text)'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
