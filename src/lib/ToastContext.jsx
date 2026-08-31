import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, tone = 'default') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          zIndex: 1200
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: 'var(--surface-raised)',
              border: `1px solid ${t.tone === 'danger' ? 'var(--danger)' : t.tone === 'success' ? 'var(--success)' : 'var(--border-strong)'}`,
              color: 'var(--text)',
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              fontSize: 13,
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
