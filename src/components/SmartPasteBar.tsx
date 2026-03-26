import { useState } from 'react'
import type { TalentInsert } from '../types/talent'

interface SmartPasteBarProps {
  onResult: (prefilled: Partial<TalentInsert>, platform?: string) => void
}

function isUrl(text: string): boolean {
  try {
    const u = new URL(text.startsWith('http') ? text : `https://${text}`)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

export default function SmartPasteBar({ onResult }: SmartPasteBarProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const url = value.trim()
    if (!url || !isUrl(url)) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/scrape-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.startsWith('http') ? url : `https://${url}` }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      const prefilled: Partial<TalentInsert> = {
        name: data.name || '',
        image_url: data.image_url || '',
        notes: data.notes || '',
        location: data.location || '',
        data: {
          links: data.links?.length ? data.links : [{ label: '', url }],
          pins: [],
        },
      }

      setValue('')
      onResult(prefilled, data.platform)
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
              // Auto-submit after paste
              setTimeout(() => {
                setValue(text)
                setLoading(true)
                fetch('/api/scrape-artist', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: text.startsWith('http') ? text : `https://${text}` }),
                })
                  .then((r) => r.json())
                  .then((data) => {
                    const prefilled: Partial<TalentInsert> = {
                      name: data.name || '',
                      image_url: data.image_url || '',
                      notes: data.notes || '',
                      location: data.location || '',
                      data: {
                        links: data.links?.length ? data.links : [{ label: '', url: text }],
                        pins: [],
                      },
                    }
                    setValue('')
                    onResult(prefilled, data.platform)
                  })
                  .catch(() => {
                    setError('Impossible d\'analyser')
                    setTimeout(() => setError(''), 2000)
                  })
                  .finally(() => setLoading(false))
              }, 50)
            }
          }}
          disabled={loading}
          placeholder={loading ? 'Analyse de la page...' : 'Coller une URL pour ajouter un talent...'}
          className={`flex-1 bg-transparent px-2 py-2 text-sm outline-none ${
            loading ? 'text-neutral-500 animate-pulse' : error ? 'text-red-400' : 'text-white'
          } placeholder:text-neutral-600`}
        />
        {error ? (
          <span className="pr-3 text-xs text-red-400 whitespace-nowrap">{error}</span>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={loading || !value.trim()}
            className="px-3 py-2 text-neutral-500 hover:text-neutral-300 disabled:opacity-30 transition-colors text-sm"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
