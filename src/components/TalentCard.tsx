import { useState } from 'react'
import type { Talent } from '../types/talent'
import type { StatusId } from '../lib/constants'
import Avatar from './Avatar'
import QuickStatus from './QuickStatus'
import LinkChip from './LinkChip'

interface TalentCardProps {
  talent: Talent
  onEdit: (talent: Talent) => void
  onStatusChange: (id: string, status: StatusId) => void
}

export default function TalentCard({ talent, onEdit, onStatusChange }: TalentCardProps) {
  const [pinsExpanded, setPinsExpanded] = useState(false)

  const links = talent.data?.links ?? []
  const pins = talent.data?.pins ?? []
  const visibleLinks = links.slice(0, 3)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', talent.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="bg-[#111] border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-colors"
    >
      {/* Zone haute — cliquable → onEdit */}
      <div
        onClick={() => onEdit(talent)}
        className="p-3 cursor-pointer relative group"
      >
        <span className="absolute top-2 right-2 text-neutral-700 group-hover:text-neutral-500 text-xs">✎</span>

        <div className="flex items-center gap-2 mb-2">
          <Avatar src={talent.image_url} name={talent.name} size={34} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-200 truncate">{talent.name}</p>
            {talent.location && (
              <p className="text-[10px] text-neutral-500 truncate">{talent.location}</p>
            )}
          </div>
        </div>

        {talent.disciplines.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {talent.disciplines.map((d) => (
              <span key={d} className="text-[10px] uppercase tracking-wider bg-[#1c1c1c] text-neutral-500 px-1.5 py-0.5 rounded">
                {d}
              </span>
            ))}
          </div>
        )}

        {talent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {talent.tags.map((t) => (
              <span key={t} className="text-[10px] bg-[#1a1028] text-[#b48eed] px-1.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        {talent.notes && (
          <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1">{talent.notes}</p>
        )}
      </div>

      {/* Zone basse — interactive, pas de onEdit */}
      <div
        className="px-3 pb-2.5 pt-1 border-t border-neutral-800/50 flex flex-col gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <QuickStatus
          current={talent.status}
          onChange={(status) => onStatusChange(talent.id, status)}
        />

        {visibleLinks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleLinks.map((l, i) => (
              <LinkChip key={i} href={l.url} label={l.label} variant="link" />
            ))}
          </div>
        )}

        {pins.length > 0 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPinsExpanded(!pinsExpanded) }}
              className="text-[10px] text-[#f5c542] hover:text-[#ffd666] flex items-center gap-1 transition-colors"
            >
              📌 {pins.length} pin{pins.length > 1 ? 's' : ''} {pinsExpanded ? '▲' : '▼'}
            </button>
            {pinsExpanded && (
              <div className="bg-[#0d0b00] rounded-md p-1.5 flex flex-wrap gap-1">
                {pins.map((p, i) => (
                  <LinkChip key={i} href={p.url} label={p.label} variant="pin" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
