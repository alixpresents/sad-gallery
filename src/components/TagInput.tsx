import { useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [value, setValue] = useState('')

  const add = () => {
    const trimmed = value.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setValue('')
  }

  const remove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-[#1a1028] text-[#b48eed] text-[11px] px-2 py-0.5 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(i)}
            className="opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Tag…"
          className="bg-[#111] border border-neutral-800 rounded-md px-2 py-0.5 text-[11px] text-white outline-none focus:border-neutral-600 w-20"
        />
        <button
          type="button"
          onClick={add}
          className="text-neutral-500 hover:text-neutral-300 text-sm leading-none"
        >
          +
        </button>
      </div>
    </div>
  )
}
