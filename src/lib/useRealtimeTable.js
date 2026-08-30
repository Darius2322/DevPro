import { useEffect } from 'react'
import { supabase } from './supabaseClient'

/**
 * Subscribes to realtime changes on `table`, optionally filtered to a
 * single project, and calls `onChange` whenever a row is inserted,
 * updated, or deleted. RLS still applies — you only receive events for
 * rows you could otherwise SELECT.
 */
export function useRealtimeTable(table, projectId, onChange) {
  useEffect(() => {
    if (!table) return
    const channelName = `${table}-${projectId ?? 'all'}`
    const filter = projectId ? `project_id=eq.${projectId}` : undefined

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        (payload) => onChange?.(payload)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, projectId])
}
