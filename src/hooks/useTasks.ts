import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { addDays, addWeeks, addMonths, parseISO, format } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { Task, NewTaskInput, Priority, Subtask, Recurrence } from '../types/task'

const STORAGE_KEY = 'todo-tasks'

function loadFromStorage(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Task[]) : []
  } catch {
    return []
  }
}

function saveToStorage(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

function nextCustomDay(from: Date, days: number[]): Date {
  if (days.length === 0) return addDays(from, 1)
  const sorted = [...days].sort((a, b) => a - b)
  const fromDay = from.getDay()
  const next = sorted.find(d => d > fromDay)
  return next !== undefined
    ? addDays(from, next - fromDay)
    : addDays(from, 7 - fromDay + sorted[0])
}

// ── Supabase row mapping ─────────────────────────────────────────────────────

interface TaskRow {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  priority: string
  due_date: string | null
  tags: string[]
  subtasks: Subtask[]
  recurrence: Recurrence | null
  list_id: string | null
  created_at: string
  completed_at: string | null
  time_logged: number
  pinned: boolean | null
  goal_id: string | null
}

function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    priority: row.priority as Priority,
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
    subtasks: (row.subtasks ?? []) as Subtask[],
    recurrence: row.recurrence ?? undefined,
    listId: row.list_id ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    timeLogged: row.time_logged ?? 0,
    pinned: row.pinned ?? false,
    goalId: row.goal_id ?? undefined,
  }
}

function toRow(task: Task, userId: string): TaskRow {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    completed: task.completed,
    priority: task.priority,
    due_date: task.dueDate ?? null,
    tags: task.tags,
    subtasks: task.subtasks,
    recurrence: task.recurrence ?? null,
    list_id: task.listId ?? null,
    created_at: task.createdAt,
    completed_at: task.completedAt ?? null,
    time_logged: task.timeLogged ?? 0,
    pinned: task.pinned ?? null,
    goal_id: task.goalId ?? null,
  }
}

function dbChanges(changes: Partial<Omit<Task, 'id' | 'createdAt'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if ('title' in changes) out.title = changes.title
  if ('description' in changes) out.description = changes.description ?? null
  if ('completed' in changes) out.completed = changes.completed
  if ('priority' in changes) out.priority = changes.priority
  if ('dueDate' in changes) out.due_date = changes.dueDate ?? null
  if ('tags' in changes) out.tags = changes.tags
  if ('subtasks' in changes) out.subtasks = changes.subtasks
  if ('recurrence' in changes) out.recurrence = changes.recurrence ?? null
  if ('listId' in changes) out.list_id = changes.listId ?? null
  if ('completedAt' in changes) out.completed_at = changes.completedAt ?? null
  if ('timeLogged' in changes) out.time_logged = changes.timeLogged ?? 0
  if ('pinned' in changes) out.pinned = changes.pinned ?? null
  if ('goalId' in changes) out.goal_id = changes.goalId ?? null
  return out
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface DeletedTask {
  task: Task
  index: number
}

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>(() => userId ? [] : loadFromStorage())
  const [tasksLoading, setTasksLoading] = useState(!!userId)
  const [lastDeleted, setLastDeleted] = useState<DeletedTask | null>(null)

  // Guest mode: persist to localStorage
  useEffect(() => {
    if (!userId) saveToStorage(tasks)
  }, [tasks, userId])

  // Auth mode changed: reload tasks
  useEffect(() => {
    if (!userId) {
      setTasks(loadFromStorage())
      setTasksLoading(false)
      return
    }

    setTasksLoading(true)
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load tasks:', error.message)
        if (data) setTasks(data.map(r => fromRow(r as TaskRow)))
        setTasksLoading(false)
      })

    // Realtime sync
    const channel = supabase
      .channel(`tasks-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        payload => {
          const t = fromRow(payload.new as TaskRow)
          setTasks(prev => prev.some(x => x.id === t.id) ? prev : [t, ...prev])
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        payload => {
          const t = fromRow(payload.new as TaskRow)
          setTasks(prev => prev.map(x => x.id === t.id ? t : x))
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        payload => {
          const old = payload.old as { id: string }
          setTasks(prev => prev.filter(x => x.id !== old.id))
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addTask = useCallback((input: NewTaskInput): Task => {
    const task: Task = {
      id: uuidv4(),
      title: input.title.trim(),
      description: input.description?.trim(),
      completed: false,
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate,
      tags: input.tags ?? [],
      subtasks: [],
      ...(input.listId ? { listId: input.listId } : {}),
      ...(input.recurrence ? { recurrence: input.recurrence } : {}),
      ...(input.goalId ? { goalId: input.goalId } : {}),
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [task, ...prev])
    if (userId) {
      supabase.from('tasks').insert(toRow(task, userId)).then(({ error }) => {
        if (error) console.error('addTask:', error.message)
      })
    }
    return task
  }, [userId])

  const updateTask = useCallback((id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        const updated = { ...t, ...changes }
        if (changes.completed === true && !t.completedAt) {
          updated.completedAt = new Date().toISOString()
        } else if (changes.completed === false) {
          updated.completedAt = undefined
        }
        return updated
      })
    )
    if (userId) {
      const patch = dbChanges(changes)
      supabase.from('tasks').update(patch).eq('id', id).then(({ error }) => {
        if (error) console.error('updateTask:', error.message)
      })
    }
  }, [userId])

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id)
      if (!task) return prev

      if (!task.completed && task.recurrence && task.dueDate) {
        const { frequency, interval } = task.recurrence
        const base = parseISO(task.dueDate)
        const nextDue =
          frequency === 'daily' ? addDays(base, interval)
          : frequency === 'weekly' ? addWeeks(base, interval)
          : frequency === 'custom' ? nextCustomDay(base, task.recurrence.customDays ?? [])
          : addMonths(base, interval)

        const nextDueStr = format(nextDue, 'yyyy-MM-dd')
        const alreadyExists = prev.some(t =>
          t.id !== id &&
          !t.completed &&
          t.title === task.title &&
          t.recurrence?.frequency === frequency &&
          t.recurrence?.interval === interval &&
          t.dueDate === nextDueStr
        )

        const completedState = prev.map(t =>
          t.id !== id ? t : { ...t, completed: true, completedAt: new Date().toISOString() }
        )

        if (userId) {
          const now = new Date().toISOString()
          supabase.from('tasks').update({ completed: true, completed_at: now }).eq('id', id).then(({ error }) => {
            if (error) console.error('toggleTask complete:', error.message)
          })
        }

        if (alreadyExists) return completedState

        const nextTask: Task = {
          ...task,
          id: uuidv4(),
          completed: false,
          completedAt: undefined,
          timeLogged: 0,
          dueDate: nextDueStr,
          createdAt: new Date().toISOString(),
          subtasks: (task.subtasks ?? []).map(s => ({ ...s, completed: false })),
        }

        if (userId) {
          supabase.from('tasks').insert(toRow(nextTask, userId)).then(({ error }) => {
            if (error) console.error('toggleTask recur:', error.message)
          })
        }

        return [...completedState, nextTask]
      }

      const completed = !task.completed
      const completedAt = completed ? new Date().toISOString() : undefined
      if (userId) {
        supabase.from('tasks').update({ completed, completed_at: completedAt ?? null }).eq('id', id).then(({ error }) => {
          if (error) console.error('toggleTask:', error.message)
        })
      }
      return prev.map(t =>
        t.id !== id ? t : { ...t, completed, completedAt }
      )
    })
  }, [userId])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const index = prev.findIndex(t => t.id === id)
      if (index === -1) return prev
      setLastDeleted({ task: prev[index], index })
      if (userId) {
        supabase.from('tasks').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('deleteTask:', error.message)
        })
      }
      return prev.filter(t => t.id !== id)
    })
  }, [userId])

  const clearList = useCallback((listId: string | 'inbox') => {
    setTasks(prev => {
      const toDelete = prev.filter(t =>
        listId === 'inbox' ? !t.listId : t.listId === listId
      )
      if (userId) {
        const ids = toDelete.map(t => t.id)
        if (ids.length > 0) {
          supabase.from('tasks').delete().in('id', ids).then(({ error }) => {
            if (error) console.error('clearList:', error.message)
          })
        }
      }
      return listId === 'inbox'
        ? prev.filter(t => !!t.listId)
        : prev.filter(t => t.listId !== listId)
    })
  }, [userId])

  const undoDelete = useCallback(() => {
    if (!lastDeleted) return
    const { task, index } = lastDeleted
    setTasks(prev => {
      const next = [...prev]
      next.splice(index, 0, task)
      return next
    })
    if (userId) {
      supabase.from('tasks').insert(toRow(task, userId)).then(({ error }) => {
        if (error) console.error('undoDelete:', error.message)
      })
    }
    setLastDeleted(null)
  }, [lastDeleted, userId])

  const clearUndo = useCallback(() => setLastDeleted(null), [])

  const clearCompleted = useCallback(() => {
    setTasks(prev => {
      const completed = prev.filter(t => t.completed)
      if (userId && completed.length > 0) {
        const ids = completed.map(t => t.id)
        supabase.from('tasks').delete().in('id', ids).then(({ error }) => {
          if (error) console.error('clearCompleted:', error.message)
        })
      }
      return prev.filter(t => !t.completed)
    })
  }, [userId])

  const reorderTasks = useCallback((fromIndex: number, toIndex: number) => {
    setTasks(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    // Reordering is local-only for cloud users (ordering by created_at on other devices)
  }, [])

  const addSubtask = useCallback((taskId: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const subtask: Subtask = { id: uuidv4(), title: trimmed, completed: false }
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t
        const subtasks = [...(t.subtasks ?? []), subtask]
        if (userId) {
          supabase.from('tasks').update({ subtasks }).eq('id', taskId).then(({ error }) => {
            if (error) console.error('addSubtask:', error.message)
          })
        }
        return { ...t, subtasks }
      })
    )
  }, [userId])

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t
        const subtasks = (t.subtasks ?? []).map(s =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        )
        if (userId) {
          supabase.from('tasks').update({ subtasks }).eq('id', taskId).then(({ error }) => {
            if (error) console.error('toggleSubtask:', error.message)
          })
        }
        return { ...t, subtasks }
      })
    )
  }, [userId])

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t
        const subtasks = (t.subtasks ?? []).filter(s => s.id !== subtaskId)
        if (userId) {
          supabase.from('tasks').update({ subtasks }).eq('id', taskId).then(({ error }) => {
            if (error) console.error('deleteSubtask:', error.message)
          })
        }
        return { ...t, subtasks }
      })
    )
  }, [userId])

  const logTime = useCallback((id: string, seconds: number) => {
    setTasks(prev => {
      const next = prev.map(t => t.id !== id ? t : { ...t, timeLogged: (t.timeLogged ?? 0) + seconds })
      if (userId) {
        const task = next.find(t => t.id === id)
        if (task) {
          supabase.from('tasks').update({ time_logged: task.timeLogged ?? 0 }).eq('id', id).then(({ error }) => {
            if (error) console.error('logTime:', error.message)
          })
        }
      }
      return next
    })
  }, [userId])

  const importTasks = useCallback((incoming: Partial<Task>[]) => {
    setTasks(prev => {
      const existingIds = new Set(prev.map(t => t.id))
      const newTasks = incoming
        .filter(t => t.title)
        .map(t => ({
          id: uuidv4(),
          title: t.title!,
          completed: t.completed ?? false,
          priority: t.priority ?? 'medium',
          tags: t.tags ?? [],
          subtasks: t.subtasks ?? [],
          createdAt: t.createdAt ?? new Date().toISOString(),
          ...(t.dueDate ? { dueDate: t.dueDate } : {}),
          ...(t.description ? { description: t.description } : {}),
          ...(t.completedAt ? { completedAt: t.completedAt } : {}),
        } as Task))
        .filter(t => !existingIds.has(t.id))

      if (userId && newTasks.length > 0) {
        supabase.from('tasks').insert(newTasks.map(t => toRow(t, userId))).then(({ error }) => {
          if (error) console.error('importTasks:', error.message)
        })
      }
      return [...newTasks, ...prev]
    })
  }, [userId])

  const sortedByPriority = useMemo(
    () => [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [tasks],
  )

  return {
    tasks,
    tasksLoading,
    sortedByPriority,
    lastDeleted,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    clearList,
    undoDelete,
    clearUndo,
    clearCompleted,
    reorderTasks,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    importTasks,
    logTime,
  }
}
