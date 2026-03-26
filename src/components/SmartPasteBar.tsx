import { useState } from 'react'

interface ScrapeResult {
  name: string
  image_url: string
  notes: string
  location: string
  platform: string
  links: { label: string; url: string }[]
  pins: { label: string; url: string }[]
  page_type: string
  project_name: string | null
  suggested_disciplines: string[]
  suggested_tags: string[]
}

interface SmartPasteBarProps {
  onResult: (result: ScrapeResult) => void
}

function isUrl(text: string): boolean {
  try {
    const u = new URL(text.startsWith('http') ? text : `https://${text}`)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

async function fetchScrape(url: string): Promise<ScrapeResult> {
  const res = await fetch('/api/scrape-artist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.startsWith('http') ? url : `https://${url}` }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur')
  return data
}

export default function SmartPasteBar({ onResult }: SmartPasteBarProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (url?: string) => {
    const target = (url || value).trim()
    if (!target || !isUrl(target)) return

    setLoading(true)
    setError('')

    try {
      const data = await fetchScrape(target)
      setValue('')
      onResult(data)
    } catch {
      setError('Impossible d\'analyser')
      setTimeout(() => setError(''), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 max-w-md">
      <div className="flex items-center bg-[#111] border border-neutral-800 rounded-lg overflow-hidden">
        <span className="pl-3 text-neutral-600 text-sm">🔗</span>
        <input
          value={loading ? '' : value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (isUrl(text)) {
              e.preventDefault()
              setValue(text)
              setTimeout(() => submit(text), 50)
            }
          }}
          disabled={loading}
          placeholder={loading ? '' : 'Coller une URL pour ajouter un talent...'}
          className={`flex-1 bg-transparent px-2 py-2 text-sm outline-none ${
            loading ? 'text-neutral-500' : error ? 'text-red-400' : 'text-white'
          } placeholder:text-neutral-600`}
        />
        {loading ? (
          <div className="pr-3 flex flex-col items-end">
            <span className="text-xs text-neutral-400 animate-pulse whitespace-nowrap">Analyse intelligente en cours...</span>
            <span className="text-[10px] text-neutral-600 whitespace-nowrap">Identification de l'artiste et du projet...</span>
          </div>
        ) : error ? (
          <span className="pr-3 text-xs text-red-400 whitespace-nowrap">{error}</span>
        ) : (
          <button
            type="button"
            onClick={() => submit()}
            disabled={!value.trim()}
            className="px-3 py-2 text-neutral-500 hover:text-neutral-300 disabled:opacity-30 transition-colors text-sm"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
