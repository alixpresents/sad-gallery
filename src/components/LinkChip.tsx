interface LinkChipProps {
  href: string
  label?: string
  variant: 'link' | 'pin'
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export default function LinkChip({ href, label, variant }: LinkChipProps) {
  const isPin = variant === 'pin'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`
        inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] transition-colors truncate max-w-[160px]
        ${isPin
          ? 'bg-[#1a1400] text-[#f5c542] hover:bg-[#2a2000]'
          : 'bg-[#1a1a1a] text-[#7aa2f7] hover:bg-[#252525]'
        }
      `}
    >
      <span className="truncate">{label || hostname(href)}</span>
      <span className="flex-shrink-0">{isPin ? '📌' : '↗'}</span>
    </a>
  )
}
