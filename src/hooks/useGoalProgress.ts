import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import type { GoalProgressEntry } from '../types/task'

const STORAGE_KEY = 'taskflow-goal-progress'

interface ProgressRow {
  id: string
  goal_id: string
  user_id: string
  value: number
  note: string | null
  logged_at: string
}

function fromRow(row: ProgressRow): GoalProgressEntry {
  return {
    id: row.id,
    goalId: row.goal_id,
    value: row.value,
    note: row.note ?? undefined,
    loggedAt: row.logged_at,
  }
}

function load(): GoalProgressEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GoalProgressEntry[]) : []
  } catch {
    return []
  }
}

export function useGoalProgress(userId: string | null) {
  const [entries, setEntries] = useState<GoalProgressEntry[]>(() => userId ? [] : load())

  useEffect(() => {
    if (!userId) localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries, userId])

  useEffect(() => {
    if (!userId) {
      setEntries(load())
      return
    }

    supabase
      .from('goal_progress_entries')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load progress entries:', error.message)
        if (data) setEntries(data.map(r => fromRow(r as ProgressRow)))
      })

    const channel = supabase
      .channel(`goal-progress-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'goal_progress_entries', filter: `user_id=eq.${userId}` },
        payload => {
          const e = fromRow(payload.new as ProgressRow)
          setEntries(prev => prev.some(x => x.id === e.id) ? prev : [...prev, e])
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'goal_progress_entries', filter: `user_id=eq.${userId}` },
        payload => {
          const old = payload.old as { id: string }
          setEntries(prev => prev.filter(x => x.id !== old.id))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const addEntry = useCallback((goalId: string, value: number, note?: string): GoalProgressEntry => {
    const entry: GoalProgressEntry = {
      id: uuidv4(),
      goalId,
      value,
      note,
      loggedAt: new Date().toISOString(),
    }
    setEntries(prev => [...prev, entry])
    if (userId) {
      supabase.from('goal_progress_entries').insert({
        id: entry.id,
        goal_id: goalId,
        user_id: userId,
        value: entry.value,
        note: entry.note ?? null,
        logged_at: entry.loggedAt,
      }).then(({ error }) => {
        if (error) console.error('addEntry:', error.message)
      })
    }
    return entry
  }, [userId])

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    if (userId) {
      supabase.from('goal_progress_entries').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('deleteEntry:', error.message)
      })
    }
  }, [userId])

  return { entries, addEntry, deleteEntry }
}
