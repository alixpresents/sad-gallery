import type { Talent } from '../types/talent'
import type { StatusId } from '../lib/constants'
import Avatar from './Avatar'
import QuickStatus from './QuickStatus'
import LinkChip from './LinkChip'

export type SortKey = 'name' | 'status' | 'added_at'
export type SortDir = 'asc' | 'desc'

interface ListViewProps {
  talents: Talent[]
  onEdit: (talent: Talent) => void
  onStatusChange: (id: string, status: StatusId) => void
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null
  return <span className="ml-1 text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>
}

export default function ListView({ talents, onEdit, onStatusChange, sortKey, sortDir, onSort }: ListViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-[11px] text-neutral-500 uppercase tracking-wider">
            <th className="pb-2 px-2 font-medium cursor-pointer hover:text-neutral-300" onClick={() => onSort('name')}>
              Nom<SortIndicator active={sortKey === 'name'} dir={sortDir} />
            </th>
            <th className="pb-2 px-2 font-medium">Disciplines / Tags</th>
            <th className="pb-2 px-2 font-medium cursor-pointer hover:text-neutral-300" onClick={() => onSort('status')}>
              Statut<SortIndicator active={sortKey === 'status'} dir={sortDir} />
            </th>
            <th className="pb-2 px-2 font-medium">Liens</th>
            <th className="pb-2 px-2 font-medium">Pins</th>
            <th className="pb-2 px-2 font-medium cursor-pointer hover:text-neutral-300" onClick={() => onSort('added_at')}>
              Ajouté<SortIndicator active={sortKey === 'added_at'} dir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {talents.map((t) => (
            <tr
              key={t.id}
              className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors"
            >
              <td className="py-2 px-2">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => onEdit(t)}
                >
                  <Avatar src={t.image_url} name={t.name} size={28} />
                  <div className="min-w-0">
                    <p className="text-neutral-200 truncate">{t.name}</p>
                    {t.location && (
                      <p className="text-[10px] text-neutral-500 truncate">{t.location}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-2 px-2">
                <div className="flex flex-wrap gap-1">
                  {t.disciplines.map((d) => (
                    <span key={d} className="text-[10px] uppercase tracking-wider bg-[#1c1c1c] text-neutral-500 px-1.5 py-0.5 rounded">
                      {d}
                    </span>
                  ))}
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-[#1a1028] text-[#b48eed] px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                <QuickStatus current={t.status} onChange={(s) => onStatusChange(t.id, s)} />
              </td>
              <td className="py-2 px-2">
                <div className="flex flex-wrap gap-1">
                  {(t.data?.links ?? []).slice(0, 2).map((l, i) => (
                    <LinkChip key={i} href={l.url} label={l.label} variant="link" />
                  ))}
                </div>
              </td>
              <td className="py-2 px-2">
                <div className="flex flex-wrap gap-1">
                  {(t.data?.pins ?? []).slice(0, 2).map((p, i) => (
                    <LinkChip key={i} href={p.url} label={p.label} variant="pin" />
                  ))}
                </div>
              </td>
              <td className="py-2 px-2 text-[11px] text-neutral-500 whitespace-nowrap">
                {t.added_at ? new Date(t.added_at).toLocaleDateString('fr-FR') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
