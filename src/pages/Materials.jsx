import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Download, Trash2, FileText } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { EmptyState, ConfirmDialog } from '../components/ui/Primitives'

const BUCKET = 'materials'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Materials() {
  const { user } = useAuth()
  const { push } = useToast()
  const [files, setFiles] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  async function load() {
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false })
    setFiles(data ?? [])
  }
  useEffect(() => { load() }, [])

  const uploadFiles = useCallback(async (fileList) => {
    setUploading(true)
    for (const file of fileList) {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (upErr) { push(`Upload failed: ${file.name}`, 'danger'); continue }
      await supabase.from('materials').insert({ user_id: user.id, storage_path: path, name: file.name, size: file.size, mime_type: file.type })
    }
    setUploading(false)
    push('Upload complete', 'success')
    load()
  }, [user?.id])

  async function downloadFile(f) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 60)
    if (error) return push(error.message || 'Could not generate download link.', 'danger')
    window.open(data.signedUrl, '_blank')
  }

  async function removeFile() {
    await supabase.storage.from(BUCKET).remove([toDelete.storage_path])
    await supabase.from('materials').delete().eq('id', toDelete.id)
    setToDelete(null)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Materials</h1>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files.length && uploadFiles(Array.from(e.target.files))} />
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 4, marginBottom: 20 }}>
        Reusable files and reference material that aren't tied to one specific project.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(Array.from(e.dataTransfer.files)) }}
        style={{
          border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 8, padding: 20,
          textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, marginBottom: 16,
          background: dragOver ? 'var(--surface-raised)' : 'transparent'
        }}
      >
        Drag & drop files here, or use Upload
      </div>

      {files?.length === 0 && <EmptyState title="No materials yet" description="Upload templates, references, or assets you reuse across projects." />}

      {files?.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Name</th><th>Size</th><th>Uploaded</th><th></th></tr></thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} color="var(--text-faint)" /> {f.name}</td>
                <td style={{ color: 'var(--text-dim)' }}>{formatSize(f.size)}</td>
                <td style={{ color: 'var(--text-dim)' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button className="icon-btn" onClick={() => downloadFile(f)}><Download size={14} /></button>
                    <button className="icon-btn" onClick={() => setToDelete(f)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={removeFile} title="Delete material" description={`Delete "${toDelete?.name}"?`} />
    </div>
  )
}
