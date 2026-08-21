import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types/task'

const STORAGE_KEY = 'taskflow-goals'

export const GOAL_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
]

interface GoalRow {
  id: string
  user_id: string
  title: string
  description: string | null
  deadline: string
  color: string
  created_at: string
  goal_type: string | null
  start_value: number | null
  target_value: number | null
  unit: string | null
}

function fromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    deadline: row.deadline,
    color: row.color,
    createdAt: row.created_at,
    goalType: (row.goal_type as 'task' | 'metric') ?? 'task',
    startValue: row.start_value ?? undefined,
    targetValue: row.target_value ?? undefined,
    unit: row.unit ?? undefined,
  }
}

function load(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Goal[]
    return parsed.map(g => ({ ...g, goalType: g.goalType ?? ('task' as const) }))
  } catch {
    return []
  }
}

export function useGoals(userId: string | null) {
  const [goals, setGoals] = useState<Goal[]>(() => userId ? [] : load())

  useEffect(() => {
    if (!userId) localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  }, [goals, userId])

  useEffect(() => {
    if (!userId) {
      setGoals(load())
      return
    }

    supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load goals:', error.message)
        if (data) setGoals(data.map(r => fromRow(r as GoalRow)))
      })

    const channel = supabase
      .channel(`goals-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        payload => {
          const g = fromRow(payload.new as GoalRow)
          setGoals(prev => prev.some(x => x.id === g.id) ? prev : [...prev, g])
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        payload => {
          const g = fromRow(payload.new as GoalRow)
          setGoals(prev => prev.map(x => x.id === g.id ? g : x))
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        payload => {
          const old = payload.old as { id: string }
          setGoals(prev => prev.filter(x => x.id !== old.id))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const addGoal = useCallback((input: Omit<Goal, 'id' | 'createdAt'>): Goal => {
    const goal: Goal = {
      id: uuidv4(),
      ...input,
      createdAt: new Date().toISOString(),
    }
    setGoals(prev => [...prev, goal])
    if (userId) {
      supabase.from('goals').insert({
        id: goal.id,
        user_id: userId,
        title: goal.title,
        description: goal.description ?? null,
        deadline: goal.deadline,
        color: goal.color,
        created_at: goal.createdAt,
        goal_type: goal.goalType,
        start_value: goal.startValue ?? null,
        target_value: goal.targetValue ?? null,
        unit: goal.unit ?? null,
      }).then(({ error }) => {
        if (error) console.error('addGoal:', error.message)
      })
    }
    return goal
  }, [userId])

  const updateGoal = useCallback((id: string, changes: Partial<Omit<Goal, 'id' | 'createdAt'>>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...changes } : g))
    if (userId) {
      const patch: Record<string, unknown> = {}
      if ('title' in changes) patch.title = changes.title
      if ('description' in changes) patch.description = changes.description ?? null
      if ('deadline' in changes) patch.deadline = changes.deadline
      if ('color' in changes) patch.color = changes.color
      if ('startValue' in changes) patch.start_value = changes.startValue ?? null
      if ('targetValue' in changes) patch.target_value = changes.targetValue ?? null
      if ('unit' in changes) patch.unit = changes.unit ?? null
      supabase.from('goals').update(patch).eq('id', id).then(({ error }) => {
        if (error) console.error('updateGoal:', error.message)
      })
    }
  }, [userId])

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    if (userId) {
      supabase.from('goals').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('deleteGoal:', error.message)
      })
    }
  }, [userId])

  return { goals, addGoal, updateGoal, deleteGoal }
}
