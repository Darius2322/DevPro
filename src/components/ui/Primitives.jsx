import { useEffect, useRef } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../lib/ToastContext'

export function Badge({ tone = 'default', children }) {
  const colors = {
    default: { bg: 'var(--surface-raised)', border: 'var(--border-strong)', text: 'var(--text-dim)' },
    active: { bg: 'rgba(63,178,127,0.12)', border: 'var(--success)', text: 'var(--success)' },
    planning: { bg: 'rgba(79,140,255,0.12)', border: 'var(--accent)', text: 'var(--accent)' },
    paused: { bg: 'rgba(212,169,79,0.12)', border: 'var(--vault)', text: 'var(--vault)' },
    archived: { bg: 'rgba(139,144,156,0.12)', border: 'var(--text-faint)', text: 'var(--text-dim)' },
    danger: { bg: 'rgba(229,83,75,0.12)', border: 'var(--danger)', text: 'var(--danger)' }
  }
  const c = colors[tone] ?? colors.default
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 999,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        border: '1px dashed var(--border-strong)',
        borderRadius: 'var(--radius)',
        color: 'var(--text-dim)'
      }}
    >
      <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, marginBottom: action ? 16 : 0 }}>{description}</div>
      {action}
    </div>
  )
}

export function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const { push } = useToast()
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      push('Copied')
      setTimeout(() => setCopied(false), 1200)
    } catch {
      push('Copy failed', 'danger')
    }
  }
  return (
    <button className="icon-btn" onClick={onClick} title={label} aria-label={label}>
      {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
    </button>
  )
}

export function Modal({ open, onClose, title, children, width = 480 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,9,12,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 900,
        padding: 16
      }}
    >
      <div
        ref={ref}
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <strong>{title}</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', tone = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>{description}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
