function getInitials(name, email) {
  const source = (name || '').trim() || (email || '')
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export default function Avatar({ name, email, size = 32 }) {
  const initials = getInitials(name, email)
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', background: 'var(--vault-dim)', color: 'var(--vault)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700,
        flexShrink: 0, userSelect: 'none'
      }}
    >
      {initials}
    </div>
  )
}
