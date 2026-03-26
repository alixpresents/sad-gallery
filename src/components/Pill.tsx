interface PillProps {
  children: React.ReactNode
  active: boolean
  onClick?: () => void
  color?: string
  small?: boolean
  onRemove?: () => void
}

export default function Pill({ children, active, onClick, color, small, onRemove }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full border transition-colors
        ${small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
        ${active
          ? 'text-black font-medium'
          : 'border-neutral-700 text-neutral-500 hover:border-neutral-500'
        }
      `}
      style={active ? {
        backgroundColor: color || '#fff',
        borderColor: color || '#fff',
      } : undefined}
    >
      {children}
      {onRemove && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 opacity-60 hover:opacity-100"
        >
          ×
        </span>
      )}
    </button>
  )
}
