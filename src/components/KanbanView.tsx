import { useState } from 'react'
import { STATUSES } from '../lib/constants'
import type { StatusId } from '../lib/constants'
import type { Talent } from '../types/talent'
import TalentCard from './TalentCard'

interface KanbanViewProps {
  talents: Talent[]
  onEdit: (talent: Talent) => void
  onStatusChange: (id: string, status: StatusId) => void
}

export default function KanbanView({ talents, onEdit, onStatusChange }: KanbanViewProps) {
  return (
    <div className="grid grid-cols-4 gap-4 min-h-0">
      {STATUSES.map((status) => (
        <Column
          key={status.id}
          status={status}
          talents={talents.filter((t) => t.status === status.id)}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}

function Column({
  status,
  talents,
  onEdit,
  onStatusChange,
}: {
  status: typeof STATUSES[number]
  talents: Talent[]
  onEdit: (talent: Talent) => void
  onStatusChange: (id: string, status: StatusId) => void
}) {
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const id = e.dataTransfer.getData('text/plain')
        if (id) onStatusChange(id, status.id)
      }}
      className={`
        flex flex-col rounded-xl p-2 transition-colors min-h-[200px]
        ${over ? 'border-2 border-dashed' : 'border-2 border-transparent'}
      `}
      style={over ? { borderColor: status.color, backgroundColor: status.color + '08' } : undefined}
    >
      <div className="flex items-center gap-2 px-1 mb-3">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-xs font-medium text-neutral-300">{status.label}</span>
        <span className="text-[10px] text-neutral-600 ml-auto">{talents.length}</span>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {talents.map((t) => (
          <TalentCard
            key={t.id}
            talent={t}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  )
}
