import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTalents } from './hooks/useTalents'
import type { Talent, TalentInsert } from './types/talent'
import type { StatusId } from './lib/constants'
import { DISCIPLINES, STATUSES } from './lib/constants'
import type { SortKey, SortDir } from './components/ListView'
import KanbanView from './components/KanbanView'
import ListView from './components/ListView'
import GalleryView from './components/GalleryView'
import TalentModal from './components/TalentModal'
import Pill from './components/Pill'
import SmartPasteBar from './components/SmartPasteBar'

type View = 'board' | 'list' | 'gallery'

const VIEW_LABELS: { id: View; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'list', label: 'Liste' },
  { id: 'gallery', label: 'Galerie' },
]

const EMPTY_TALENT: TalentInsert = {
  name: '',
  status: 'discovered',
  disciplines: [],
  tags: [],
  image_url: '',
  location: '',
  email: '',
  notes: '',
  added_at: new Date().toISOString().slice(0, 10),
  last_contact: null,
  data: { links: [{ label: '', url: '' }], pins: [{ label: '', url: '' }] },
}

function App() {
  const { session, user, loading: authLoading, signIn, signOut } = useAuth()
  const { talents, loading: dataLoading, upsert, remove, changeStatus } = useTalents()

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // App state
  const [view, setView] = useState<View>('board')
  const [search, setSearch] = useState('')
  const [filterDisc, setFilterDisc] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Talent | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('added_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [newTalentDefaults, setNewTalentDefaults] = useState<Partial<TalentInsert> | null>(null)
  const [prefilledPlatform, setPrefilledPlatform] = useState<string | undefined>(undefined)

  // --- Login ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      await signIn(email, password)
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Erreur de connexion')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-['Inter']">
        <p className="text-neutral-600">Chargement...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-['Inter']">
        <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-neutral-600 text-xs uppercase tracking-widest">SAD PICTURES</p>
          <h1 className="text-xl font-bold text-white">Gallery · Talent Board</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#111] border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-neutral-600"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#111] border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-neutral-600"
          />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button
            type="submit"
            className="bg-white text-black rounded-lg py-2.5 font-semibold text-sm hover:bg-neutral-200 transition-colors"
          >
            Se connecter
          </button>
        </form>
      </div>
    )
  }

  // --- Filtrage ---
  const q = search.toLowerCase()
  const filtered = talents.filter((t) => {
    if (q) {
      const haystack = [t.name, t.notes, t.location, ...(t.tags || [])].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (filterDisc && !(t.disciplines || []).includes(filterDisc)) return false
    if (filterStatus && t.status !== filterStatus) return false
    return true
  })

  // --- Tri ---
  const statusIndex = (s: string) => STATUSES.findIndex((st) => st.id === s)

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortKey === 'added_at') cmp = (a.added_at || '').localeCompare(b.added_at || '')
    else if (sortKey === 'status') cmp = statusIndex(a.status) - statusIndex(b.status)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // --- Handlers ---
  const handleUpsert = async (data: Talent | TalentInsert) => {
    await upsert(data)
    setEditing(null)
    setShowNew(false)
  }

  const handleRemove = async (id: string) => {
    await remove(id)
    setEditing(null)
  }

  const handleStatusChange = (id: string, status: StatusId) => {
    changeStatus(id, status)
  }

  // --- Counts ---
  const confirmedCount = talents.filter((t) => t.status === 'confirmed').length

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-8 font-['Inter']">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] tracking-[.14em] uppercase text-neutral-600 mb-1">SAD PICTURES</p>
          <h1 className="text-2xl font-bold text-neutral-200 tracking-tight">Gallery · Talent Board</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {talents.length} talent{talents.length !== 1 ? 's' : ''} · {confirmedCount} confirmé{confirmedCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-neutral-700 hidden md:inline">{user?.email}</span>
          <button onClick={signOut} className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
            Déconnexion
          </button>
          <button
            onClick={() => { setNewTalentDefaults(null); setPrefilledPlatform(undefined); setShowNew(true) }}
            className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-neutral-200 transition-colors"
          >
            + Nouveau talent
          </button>
        </div>
      </div>

      {/* Smart Paste */}
      <div className="mb-6">
        <SmartPasteBar
          onResult={(prefilled, platform) => {
            setNewTalentDefaults(prefilled)
            setPrefilledPlatform(platform)
            setShowNew(true)
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* View toggle */}
        <div className="flex bg-[#111] rounded-lg p-0.5">
          {VIEW_LABELS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                view === v.id
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="bg-[#111] border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-neutral-600 w-44"
        />

        {/* Discipline filter */}
        <div className="flex flex-wrap gap-1">
          <Pill active={!filterDisc} onClick={() => setFilterDisc(null)} small>
            Tous
          </Pill>
          {DISCIPLINES.map((d) => (
            <Pill
              key={d}
              active={filterDisc === d}
              onClick={() => setFilterDisc(filterDisc === d ? null : d)}
              small
            >
              {d}
            </Pill>
          ))}
        </div>

        {/* Status filter (list + gallery only) */}
        {view !== 'board' && (
          <div className="flex flex-wrap gap-1">
            <Pill active={!filterStatus} onClick={() => setFilterStatus(null)} small>
              Tous
            </Pill>
            {STATUSES.map((s) => (
              <Pill
                key={s.id}
                active={filterStatus === s.id}
                onClick={() => setFilterStatus(filterStatus === s.id ? null : s.id)}
                color={s.color}
                small
              >
                {s.label}
              </Pill>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {dataLoading ? (
        <p className="text-neutral-600 text-sm">Chargement des talents...</p>
      ) : (
        <>
          {/* Content */}
          {view === 'board' && (
            <KanbanView talents={sorted} onEdit={setEditing} onStatusChange={handleStatusChange} />
          )}
          {view === 'list' && (
            <ListView
              talents={sorted}
              onEdit={setEditing}
              onStatusChange={handleStatusChange}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
          {view === 'gallery' && (
            <GalleryView talents={sorted} onEdit={setEditing} onStatusChange={handleStatusChange} />
          )}
        </>
      )}

      {/* Modals */}
      {editing && (
        <TalentModal
          talent={editing}
          onSave={handleUpsert}
          onDelete={handleRemove}
          onClose={() => setEditing(null)}
        />
      )}
      {showNew && (
        <TalentModal
          talent={{
            ...EMPTY_TALENT,
            added_at: new Date().toISOString().slice(0, 10),
            ...newTalentDefaults,
          }}
          onSave={handleUpsert}
          onClose={() => { setShowNew(false); setNewTalentDefaults(null); setPrefilledPlatform(undefined) }}
          prefilledPlatform={prefilledPlatform}
        />
      )}
    </div>
  )
}

export default App
