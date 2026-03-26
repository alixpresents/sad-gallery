import { useEffect, useRef, useState } from 'react'
import { STATUSES } from '../lib/constants'
import type { StatusId } from '../lib/constants'

interface QuickStatusProps {
  current: StatusId
  onChange: (status: StatusId) => void
}

export default function QuickStatus({ current, onChange }: QuickStatusProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentStatus = STATUSES.find((s) => s.id === current) ?? STATUSES[0]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentStatus.color }}
        />
        {currentStatus.label}
        <span className="text-[9px]">▼</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#111] border border-neutral-800 rounded-lg py-1 min-w-[140px] shadow-xl">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(s.id)
                setOpen(false)
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors
                ${s.id === current ? 'bg-neutral-800/50 text-white' : 'text-neutral-400 hover:bg-neutral-800/30'}
              `}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
