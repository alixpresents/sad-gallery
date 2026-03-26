import { useState } from 'react'
import { useAuth } from './hooks/useAuth'

function App() {
  const { session, user, loading, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await signIn(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    }
  }

  if (loading) {
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

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

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-['Inter']">
      <p className="text-neutral-600 text-xs uppercase tracking-[.14em]">SAD PICTURES</p>
      <h1 className="text-2xl font-bold text-neutral-200">Gallery · Talent Board</h1>
      <p className="text-sm text-neutral-500 mt-2">Connecté en tant que {user?.email}</p>
      <button onClick={signOut} className="mt-4 text-xs text-neutral-500 underline">Déconnexion</button>
    </div>
  )
}

export default App
