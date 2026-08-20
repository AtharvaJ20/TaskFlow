import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTasks } from '../../hooks/useTasks'

// Isolate localStorage between tests
beforeEach(() => {
  localStorage.clear()
})

describe('useTasks – addTask', () => {
  it('adds a task and returns it at the front of the list', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'First', priority: 'medium' })
    })
    act(() => {
      result.current.addTask({ title: 'Second', priority: 'high' })
    })

    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[0].title).toBe('Second') // newest first
    expect(result.current.tasks[1].title).toBe('First')
  })

  it('trims whitespace from the title', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: '  Buy groceries  ', priority: 'low' })
    })

    expect(result.current.tasks[0].title).toBe('Buy groceries')
  })

  it('defaults priority to medium when not provided', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'Task' })
    })

    expect(result.current.tasks[0].priority).toBe('medium')
  })

  it('stores an empty tags array when tags are not provided', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'Task' })
    })

    expect(result.current.tasks[0].tags).toEqual([])
  })

  it('sets completed to false on creation', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'Task' })
    })

    expect(result.current.tasks[0].completed).toBe(false)
    expect(result.current.tasks[0].completedAt).toBeUndefined()
  })
})

describe('useTasks – toggleTask', () => {
  it('marks an active task as completed and sets completedAt', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'Task' })
    })
    const id = result.current.tasks[0].id

    act(() => {
      result.current.toggleTask(id)
    })

    const task = result.current.tasks.find(t => t.id === id)
    expect(task?.completed).toBe(true)
    expect(task?.completedAt).toBeDefined()
  })

  it('marks a completed task as active and clears completedAt', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'Task' })
    })
    const id = result.current.tasks[0].id

    act(() => { result.current.toggleTask(id) }) // complete
    act(() => { result.current.toggleTask(id) }) // un-complete

    const task = result.current.tasks.find(t => t.id === id)
    expect(task?.completed).toBe(false)
    expect(task?.completedAt).toBeUndefined()
  })

  it('does not mutate other tasks', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'A' })
      result.current.addTask({ title: 'B' })
    })
    const idA = result.current.tasks.find(t => t.title === 'A')!.id

    act(() => { result.current.toggleTask(idA) })

    const taskB = result.current.tasks.find(t => t.title === 'B')
    expect(taskB?.completed).toBe(false)
  })
})

describe('useTasks – deleteTask + undoDelete', () => {
  it('removes the task from the list', () => {
    const { result } = renderHook(() => useTasks())

    act(() => { result.current.addTask({ title: 'Task' }) })
    const id = result.current.tasks[0].id

    act(() => { result.current.deleteTask(id) })

    expect(result.current.tasks).toHaveLength(0)
  })

  it('stores the deleted task and its original index in lastDeleted', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'A' })
      result.current.addTask({ title: 'B' }) // index 0 (newest first)
    })
    const idA = result.current.tasks.find(t => t.title === 'A')!.id

    act(() => { result.current.deleteTask(idA) })

    expect(result.current.lastDeleted?.task.title).toBe('A')
    expect(result.current.lastDeleted?.index).toBe(1)
  })

  it('restores the task to its original position on undoDelete', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'A' })
      result.current.addTask({ title: 'B' })
    })
    const idA = result.current.tasks.find(t => t.title === 'A')!.id

    act(() => { result.current.deleteTask(idA) })
    act(() => { result.current.undoDelete() })

    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[1].title).toBe('A')
    expect(result.current.lastDeleted).toBeNull()
  })

  it('clearUndo sets lastDeleted to null without restoring the task', () => {
    const { result } = renderHook(() => useTasks())

    act(() => { result.current.addTask({ title: 'Task' }) })
    const id = result.current.tasks[0].id

    act(() => { result.current.deleteTask(id) })
    act(() => { result.current.clearUndo() })

    expect(result.current.lastDeleted).toBeNull()
    expect(result.current.tasks).toHaveLength(0)
  })
})

describe('useTasks – updateTask', () => {
  it('applies partial changes to the target task', () => {
    const { result } = renderHook(() => useTasks())

    act(() => { result.current.addTask({ title: 'Old title' }) })
    const id = result.current.tasks[0].id

    act(() => { result.current.updateTask(id, { title: 'New title', priority: 'high' }) })

    const task = result.current.tasks.find(t => t.id === id)
    expect(task?.title).toBe('New title')
    expect(task?.priority).toBe('high')
  })

  it('sets completedAt when completed is set to true via updateTask', () => {
    const { result } = renderHook(() => useTasks())

    act(() => { result.current.addTask({ title: 'Task' }) })
    const id = result.current.tasks[0].id

    act(() => { result.current.updateTask(id, { completed: true }) })

    expect(result.current.tasks.find(t => t.id === id)?.completedAt).toBeDefined()
  })

  it('clears completedAt when completed is set to false via updateTask', () => {
    const { result } = renderHook(() => useTasks())

    act(() => { result.current.addTask({ title: 'Task' }) })
    const id = result.current.tasks[0].id

    act(() => { result.current.updateTask(id, { completed: true }) })
    act(() => { result.current.updateTask(id, { completed: false }) })

    expect(result.current.tasks.find(t => t.id === id)?.completedAt).toBeUndefined()
  })
})

describe('useTasks – clearCompleted', () => {
  it('removes all completed tasks and leaves active ones', () => {
    const { result } = renderHook(() => useTasks())

    act(() => {
      result.current.addTask({ title: 'Active' })
      result.current.addTask({ title: 'Done' })
    })
    const doneId = result.current.tasks.find(t => t.title === 'Done')!.id

    act(() => { result.current.toggleTask(doneId) })
    act(() => { result.current.clearCompleted() })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Active')
  })
})

describe('useTasks – localStorage persistence', () => {
  it('persists tasks to localStorage on change', () => {
    const { result } = renderHook(() => useTasks())

    act(() => { result.current.addTask({ title: 'Persisted' }) })

    const stored = JSON.parse(localStorage.getItem('todo-tasks') ?? '[]') as { title: string }[]
    expect(stored[0].title).toBe('Persisted')
  })

  it('loads existing tasks from localStorage on mount', () => {
    const seed = [{ id: '1', title: 'Seeded', completed: false, priority: 'low', tags: [], createdAt: new Date().toISOString() }]
    localStorage.setItem('todo-tasks', JSON.stringify(seed))

    const { result } = renderHook(() => useTasks())

    expect(result.current.tasks[0].title).toBe('Seeded')
  })

  it('returns an empty list when localStorage contains invalid JSON', () => {
    localStorage.setItem('todo-tasks', 'not-json')

    const { result } = renderHook(() => useTasks())

    expect(result.current.tasks).toEqual([])
  })
})
