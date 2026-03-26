import { useState } from 'react'
import type { Talent, TalentInsert } from '../types/talent'
import type { StatusId } from '../lib/constants'
import { DISCIPLINES, STATUSES } from '../lib/constants'
import Avatar from './Avatar'
import Pill from './Pill'
import TagInput from './TagInput'
import DynamicRows from './DynamicRows'

interface TalentModalProps {
  talent: Talent | TalentInsert
  onSave: (data: Talent | TalentInsert) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

interface FormState {
  name: string
  image_url: string
  location: string
  email: string
  disciplines: string[]
  tags: string[]
  status: StatusId
  links: { label: string; url: string }[]
  pins: { label: string; url: string }[]
  notes: string
  added_at: string
  last_contact: string
}

function initForm(talent: Talent | TalentInsert): FormState {
  return {
    name: talent.name || '',
    image_url: talent.image_url || '',
    location: talent.location || '',
    email: talent.email || '',
    disciplines: [...(talent.disciplines || [])],
    tags: [...(talent.tags || [])],
    status: talent.status || 'discovered',
    links: talent.data?.links?.length ? talent.data.links.map((l) => ({ ...l })) : [{ label: '', url: '' }],
    pins: talent.data?.pins?.length ? talent.data.pins.map((p) => ({ ...p })) : [{ label: '', url: '' }],
    notes: talent.notes || '',
    added_at: talent.added_at || new Date().toISOString().slice(0, 10),
    last_contact: talent.last_contact || '',
  }
}

export default function TalentModal({ talent, onSave, onDelete, onClose }: TalentModalProps) {
  const [form, setForm] = useState<FormState>(() => initForm(talent))
  const isEdit = 'id' in talent && !!talent.id

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleDiscipline = (d: string) => {
    set(
      'disciplines',
      form.disciplines.includes(d)
        ? form.disciplines.filter((x) => x !== d)
        : [...form.disciplines, d]
    )
  }

  const handleSave = () => {
    const cleanLinks = form.links.filter((l) => l.url.trim())
    const cleanPins = form.pins.filter((p) => p.url.trim())

    const payload = {
      ...(isEdit ? { id: (talent as Talent).id } : {}),
      name: form.name,
      image_url: form.image_url,
      location: form.location,
      email: form.email,
      disciplines: form.disciplines,
      tags: form.tags,
      status: form.status,
      notes: form.notes,
      added_at: form.added_at,
      last_contact: form.last_contact || null,
      data: { links: cleanLinks, pins: cleanPins },
    }

    onSave(payload as Talent | TalentInsert)
  }

  const handleDelete = () => {
    if (!onDelete || !isEdit) return
    if (confirm('Supprimer ce talent ?')) {
      onDelete((talent as Talent).id)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-7 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-neutral-200">
            {isEdit ? 'Modifier' : 'Nouveau talent'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Image + Nom */}
        <div className="flex gap-4 mb-5">
          <Avatar src={form.image_url} name={form.name || '?'} size={64} />
          <div className="flex-1 flex flex-col gap-2">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Nom"
              className="bg-[#111] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
            <input
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="URL image"
              className="bg-[#111] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Localisation + Email */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-1">Localisation</label>
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Paris, France"
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Disciplines */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Disciplines</label>
          <div className="flex flex-wrap gap-1.5">
            {DISCIPLINES.map((d) => (
              <Pill
                key={d}
                active={form.disciplines.includes(d)}
                onClick={() => toggleDiscipline(d)}
                small
              >
                {d}
              </Pill>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Tags</label>
          <TagInput tags={form.tags} onChange={(tags) => set('tags', tags)} />
        </div>

        {/* Statut */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Statut</label>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Pill
                key={s.id}
                active={form.status === s.id}
                onClick={() => set('status', s.id)}
                color={s.color}
                small
              >
                {s.label}
              </Pill>
            ))}
          </div>
        </div>

        {/* Liens */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Liens</label>
          <DynamicRows
            items={form.links}
            onChange={(links) => set('links', links)}
            labelPlaceholder="Instagram"
            placeholder="https://instagram.com/..."
          />
        </div>

        {/* Pins */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">📌 Pins</label>
          <DynamicRows
            items={form.pins}
            onChange={(pins) => set('pins', pins)}
            labelPlaceholder="Titre"
            placeholder="https://work-url..."
          />
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-2">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            className="w-full bg-[#111] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600 resize-y"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-1">Date d'ajout</label>
            <input
              type="date"
              value={form.added_at}
              onChange={(e) => set('added_at', e.target.value)}
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 font-medium mb-1">Dernier contact</label>
            <input
              type="date"
              value={form.last_contact}
              onChange={(e) => set('last_contact', e.target.value)}
              className="w-full bg-[#111] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <div>
            {onDelete && isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-white text-black rounded-lg px-5 py-2 text-sm font-semibold hover:bg-neutral-200 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
