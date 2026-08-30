import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, FolderKanban, Link2, Code2, StickyNote, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const ICONS = { Projects: FolderKanban, URLs: Link2, APIs: Code2, Notes: StickyNote, Secrets: KeyRound }

export default function GlobalSearchButton() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) { setResults({}); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      const like = `%${q}%`
      const [{ data: projects }, { data: urls }, { data: apis }, { data: notes }, { data: secrets }] = await Promise.all([
        supabase.from('projects').select('id, name').ilike('name', like).limit(5),
        supabase.from('urls').select('id, name, project_id, url').ilike('name', like).limit(5),
        supabase.from('apis').select('id, name, project_id').ilike('name', like).limit(5),
        supabase.from('notes').select('id, title, project_id').ilike('title', like).limit(5),
        // Metadata only — never the encrypted value, never searched.
        supabase.from('secrets').select('id, name, project_id').ilike('name', like).limit(5)
      ])
      setResults({ Projects: projects, URLs: urls, APIs: apis, Notes: notes, Secrets: secrets })
      setSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query, open])

  function go(category, item) {
    setOpen(false)
    setQuery('')
    if (category === 'Projects') navigate(`/projects/${item.id}`)
    else if (category === 'URLs') navigate(item.project_id ? `/projects/${item.project_id}?tab=URLs` : '/urls')
    else if (category === 'APIs') navigate(`/projects/${item.project_id}?tab=APIs`)
    else if (category === 'Notes') navigate(`/projects/${item.project_id}?tab=Notes`)
    else if (category === 'Secrets') navigate(item.project_id ? `/projects/${item.project_id}?tab=Secrets` : '/secrets')
  }

  const hasResults = Object.values(results).some((r) => r?.length)

  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Search">
        <Search size={18} />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,12,0.6)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}
        >
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <Search size={14} color="var(--text-faint)" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, URLs, APIs, notes, secret names…"
                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text)', fontSize: 14 }}
              />
              <button className="icon-btn" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }} className="scrollbar-thin">
              {query.trim().length < 2 && <div style={{ padding: 16, fontSize: 13, color: 'var(--text-faint)' }}>Type at least 2 characters…</div>}
              {query.trim().length >= 2 && !searching && !hasResults && <div style={{ padding: 16, fontSize: 13, color: 'var(--text-faint)' }}>No matches.</div>}
              {Object.entries(results).map(([category, items]) =>
                items?.length ? (
                  <div key={category}>
                    <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{category}</div>
                    {items.map((item) => {
                      const Icon = ICONS[category]
                      return (
                        <button
                          key={item.id}
                          onClick={() => go(category, item)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, textAlign: 'left' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-raised)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <Icon size={14} color="var(--text-dim)" />
                          {item.name || item.title}
                        </button>
                      )
                    })}
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
