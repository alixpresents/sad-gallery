import type { Talent } from '../types/talent'
import type { StatusId } from '../lib/constants'
import QuickStatus from './QuickStatus'

interface GalleryViewProps {
  talents: Talent[]
  onEdit: (talent: Talent) => void
  onStatusChange: (id: string, status: StatusId) => void
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function GalleryView({ talents, onEdit, onStatusChange }: GalleryViewProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {talents.map((t) => (
        <div
          key={t.id}
          className="bg-[#111] border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 hover:-translate-y-0.5 transition-all group"
        >
          {/* Image zone */}
          <div
            onClick={() => onEdit(t)}
            className="h-[200px] cursor-pointer overflow-hidden"
          >
            {t.image_url ? (
              <img
                src={t.image_url}
                alt={t.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-[#1c1c1c] flex items-center justify-center text-neutral-600 text-4xl font-bold">
                {getInitials(t.name || '?')}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="text-sm font-medium text-neutral-200 truncate">{t.name}</p>
            {t.location && (
              <p className="text-[10px] text-neutral-500 truncate">{t.location}</p>
            )}
            {t.disciplines.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {t.disciplines.map((d) => (
                  <span key={d} className="text-[9px] uppercase tracking-wider bg-[#1c1c1c] text-neutral-500 px-1.5 py-0.5 rounded">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-3 pb-2.5 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <QuickStatus current={t.status} onChange={(s) => onStatusChange(t.id, s)} />
            <div className="flex gap-1">
              {(t.data?.links ?? []).slice(0, 2).map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] text-[#7aa2f7] hover:text-[#99b5f9]"
                  title={l.label || l.url}
                >
                  ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
