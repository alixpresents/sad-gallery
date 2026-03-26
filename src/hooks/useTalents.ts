import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Talent, TalentInsert, TalentUpdate } from '../types/talent'
import type { StatusId } from '../lib/constants'

export function useTalents() {
  const [talents, setTalents] = useState<Talent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTalents = async () => {
      const { data, error: err } = await supabase
        .from('spg_artists')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) {
        console.error('Failed to fetch artists:', err)
        setError(err.message)
      } else {
        setTalents(data as Talent[])
      }
      setLoading(false)
    }

    fetchTalents()

    const channel = supabase
      .channel('spg_artists_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spg_artists' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTalent = payload.new as Talent
            setTalents((prev) =>
              prev.some((t) => t.id === newTalent.id)
                ? prev
                : [newTalent, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Talent
            setTalents((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            )
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setTalents((prev) => prev.filter((t) => t.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const upsert = useCallback(async (talent: TalentInsert | TalentUpdate) => {
    // Optimistic update
    if ('id' in talent && talent.id) {
      setTalents((prev) =>
        prev.map((t) => (t.id === talent.id ? { ...t, ...talent } : t))
      )
    }

    const { data, error: err } = await supabase
      .from('spg_artists')
      .upsert(talent)
      .select()
      .single()

    if (err) {
      console.error('Failed to upsert artist:', err)
      setError(err.message)
      // Rollback: refetch
      const { data: fresh } = await supabase
        .from('spg_artists')
        .select('*')
        .order('created_at', { ascending: false })
      if (fresh) setTalents(fresh as Talent[])
      return null
    }

    // For inserts, add to state (realtime will also fire but we dedupe)
    if (!('id' in talent) || !talent.id) {
      setTalents((prev) =>
        prev.some((t) => t.id === (data as Talent).id)
          ? prev
          : [data as Talent, ...prev]
      )
    }

    return data as Talent
  }, [])

  const remove = useCallback(async (id: string) => {
    // Optimistic: remove from state
    let removed: Talent | undefined
    setTalents((prev) => {
      removed = prev.find((t) => t.id === id)
      return prev.filter((t) => t.id !== id)
    })

    const { error: err } = await supabase
      .from('spg_artists')
      .delete()
      .eq('id', id)

    if (err) {
      console.error('Failed to delete artist:', err)
      setError(err.message)
      // Rollback
      if (removed) {
        setTalents((prev) => [removed!, ...prev])
      }
    }
  }, [])

  const changeStatus = useCallback(async (id: string, status: StatusId) => {
    // Optimistic update
    setTalents((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    )

    const { error: err } = await supabase
      .from('spg_artists')
      .update({ status })
      .eq('id', id)

    if (err) {
      console.error('Failed to update status:', err)
      setError(err.message)
      // Rollback: refetch
      const { data: fresh } = await supabase
        .from('spg_artists')
        .select('*')
        .order('created_at', { ascending: false })
      if (fresh) setTalents(fresh as Talent[])
    }
  }, [])

  return { talents, loading, error, upsert, remove, changeStatus }
}
