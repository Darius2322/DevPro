import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('devpro-theme', theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('devpro-theme') || 'dark')

  useEffect(() => { applyTheme(theme) }, [theme])

  return (
    <button
      className="icon-btn"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
