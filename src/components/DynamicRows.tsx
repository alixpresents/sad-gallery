interface DynamicRowsProps {
  items: { label: string; url: string }[]
  onChange: (items: { label: string; url: string }[]) => void
  placeholder?: string
  labelPlaceholder?: string
}

export default function DynamicRows({ items, onChange, placeholder = 'URL', labelPlaceholder = 'Label' }: DynamicRowsProps) {
  const update = (index: number, field: 'label' | 'url', value: string) => {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const add = () => {
    onChange([...items, { label: '', url: '' }])
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={item.label}
            onChange={(e) => update(i, 'label', e.target.value)}
            placeholder={labelPlaceholder}
            className="bg-[#111] border border-neutral-800 rounded-md px-2 py-1 text-sm text-white outline-none focus:border-neutral-600 w-[100px]"
          />
          <input
            value={item.url}
            onChange={(e) => update(i, 'url', e.target.value)}
            placeholder={placeholder}
            className="bg-[#111] border border-neutral-800 rounded-md px-2 py-1 text-sm text-white outline-none focus:border-neutral-600 flex-1"
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-neutral-600 hover:text-neutral-400 text-sm"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="border border-dashed border-neutral-700 rounded-md px-3 py-1 text-xs text-neutral-500 hover:border-neutral-500 hover:text-neutral-400 transition-colors"
      >
        + Ajouter
      </button>
    </div>
  )
}
