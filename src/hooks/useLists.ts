import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import type { TaskList } from '../types/task'

const STORAGE_KEY = 'taskflow-lists'

export const LIST_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
]

interface ListRow {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

function fromRow(row: ListRow): TaskList {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at }
}

function load(): TaskList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TaskList[]) : []
  } catch {
    return []
  }
}

export function useLists(userId: string | null) {
  const [lists, setLists] = useState<TaskList[]>(() => userId ? [] : load())

  // Guest: save to localStorage
  useEffect(() => {
    if (!userId) localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
  }, [lists, userId])

  // Auth changed: reload lists
  useEffect(() => {
    if (!userId) {
      setLists(load())
      return
    }

    supabase
      .from('task_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load lists:', error.message)
        if (data) setLists(data.map(r => fromRow(r as ListRow)))
      })

    const channel = supabase
      .channel(`lists-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_lists', filter: `user_id=eq.${userId}` },
        payload => {
          const l = fromRow(payload.new as ListRow)
          setLists(prev => prev.some(x => x.id === l.id) ? prev : [...prev, l])
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'task_lists', filter: `user_id=eq.${userId}` },
        payload => {
          const l = fromRow(payload.new as ListRow)
          setLists(prev => prev.map(x => x.id === l.id ? l : x))
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'task_lists', filter: `user_id=eq.${userId}` },
        payload => {
          const old = payload.old as { id: string }
          setLists(prev => prev.filter(x => x.id !== old.id))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const addList = useCallback((name: string, color?: string): TaskList => {
    const list: TaskList = {
      id: uuidv4(),
      name: name.trim(),
      color: color ?? LIST_COLORS[0],
      createdAt: new Date().toISOString(),
    }
    setLists(prev => [...prev, list])
    if (userId) {
      supabase.from('task_lists').insert({
        id: list.id,
        user_id: userId,
        name: list.name,
        color: list.color,
        created_at: list.createdAt,
      }).then(({ error }) => {
        if (error) console.error('addList:', error.message)
      })
    }
    return list
  }, [userId])

  const updateList = useCallback((id: string, changes: Partial<Pick<TaskList, 'name' | 'color'>>) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l))
    if (userId) {
      supabase.from('task_lists').update(changes).eq('id', id).then(({ error }) => {
        if (error) console.error('updateList:', error.message)
      })
    }
  }, [userId])

  const deleteList = useCallback((id: string) => {
    setLists(prev => prev.filter(l => l.id !== id))
    if (userId) {
      supabase.from('task_lists').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('deleteList:', error.message)
      })
    }
  }, [userId])

  return { lists, addList, updateList, deleteList }
}
