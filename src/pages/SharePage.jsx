import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExternalLink, ShieldCheck, Lock } from 'lucide-react'
import { shares } from '../lib/shares'
import { Badge } from '../components/ui/Primitives'

export default function SharePage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function attempt(pw) {
    setLoading(true)
    setError(null)
    try {
      const result = await shares.view(token, pw)
      if (result.requiresPassword) {
        setNeedsPassword(true)
        if (result.error) setError(result.error)
      } else {
        setData(result)
      }
    } catch {
      setError('This link is invalid, expired, or has been revoked.')
    }
    setLoading(false)
  }

  useEffect(() => { attempt() }, [token])

  if (loading) return <Centered><p style={{ color: 'var(--text-dim)' }}>Loading…</p></Centered>

  if (needsPassword && !data) {
    return (
      <Centered>
        <form
          onSubmit={(e) => { e.preventDefault(); attempt(password) }}
          className="card"
          style={{ width: '100%', maxWidth: 340 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lock size={16} color="var(--vault)" />
            <strong>Password required</strong>
          </div>
          <div className="field">
            <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: -6 }}>{error}</p>}
          <button className="btn-primary" style={{ width: '100%' }}>Unlock</button>
        </form>
      </Centered>
    )
  }

  if (error && !data) {
    return <Centered><p style={{ color: 'var(--danger)' }}>{error}</p></Centered>
  }

  if (!data) return null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: 'var(--text-faint)', fontSize: 12 }}>
        <ShieldCheck size={13} /> Read-only shared view
      </div>
      <h1 style={{ fontSize: 22, margin: '4px 0' }}>{data.project?.name}</h1>
      {data.project?.status && <Badge>{data.project.status}</Badge>}
      <p style={{ color: 'var(--text-dim)' }}>{data.project?.description}</p>

      {data.urls && (
        <Section title="URLs">
          {data.urls.map((u, i) => (
            <Row key={i}>
              <span>{u.name} <span style={{ color: 'var(--text-faint)' }}>({u.type})</span></span>
              <a href={u.url} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>Open <ExternalLink size={12} /></a>
            </Row>
          ))}
        </Section>
      )}

      {data.apis && (
        <Section title="APIs">
          {data.apis.map((a, i) => (
            <Row key={i}>
              <span>{a.name}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{a.method} {a.base_url}{a.endpoint}</span>
            </Row>
          ))}
        </Section>
      )}

      {data.files && (
        <Section title="Files">
          {data.files.map((f, i) => (
            <Row key={i}><span>{f.name}</span><span style={{ color: 'var(--text-faint)', fontSize: 12 }}>{f.mime_type}</span></Row>
          ))}
        </Section>
      )}
    </div>
  )
}

function Centered({ children }) {
  return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>{children}</div>
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 14, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>{title}</h2>
      <div className="card">{children}</div>
    </div>
  )
}

function Row({ children }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>{children}</div>
}
