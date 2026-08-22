import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTasks } from '../../hooks/useTasks'
import type { NewTaskInput } from '../../types/task'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
})

function addInput(overrides: Partial<NewTaskInput> = {}): NewTaskInput {
  return { title: 'Read', ...overrides }
}

// ── addTask ───────────────────────────────────────────────────────────────────

describe('useTasks – addTask', () => {
  it('adds a task to the list', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Buy milk' })) })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Buy milk')
  })

  it('trims whitespace from the title', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: '  Walk dog  ' })) })
    expect(result.current.tasks[0].title).toBe('Walk dog')
  })

  it('defaults priority to medium when not provided', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput()) })
    expect(result.current.tasks[0].priority).toBe('medium')
  })
})

// ── toggleTask – non-recurring ────────────────────────────────────────────────

describe('useTasks – toggleTask (non-recurring)', () => {
  it('marks an active task as completed', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Write' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.toggleTask(id) })
    expect(result.current.tasks[0].completed).toBe(true)
    expect(result.current.tasks[0].completedAt).toBeDefined()
  })

  it('toggles a completed task back to active', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Write' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.toggleTask(id) }) // complete
    act(() => { result.current.toggleTask(id) }) // undo
    expect(result.current.tasks[0].completed).toBe(false)
    expect(result.current.tasks[0].completedAt).toBeUndefined()
  })
})

// ── toggleTask – recurring ────────────────────────────────────────────────────

describe('useTasks – toggleTask (recurring)', () => {
  it('spawns the next instance when a recurring task is completed', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({
        title: 'Read',
        dueDate: '2025-01-01',
        recurrence: { frequency: 'daily', interval: 1 },
      }))
    })
    const id = result.current.tasks[0].id
    act(() => { result.current.toggleTask(id) })

    expect(result.current.tasks).toHaveLength(2)
    const next = result.current.tasks.find(t => !t.completed)!
    expect(next.dueDate).toBe('2025-01-02')
    expect(next.recurrence?.frequency).toBe('daily')
  })

  it('does NOT spawn a duplicate when the next instance already exists', () => {
    const { result } = renderHook(() => useTasks(null))
    // Seed: two tasks — the current one (due Jan 1) and a pre-existing next instance (due Jan 2)
    act(() => {
      result.current.addTask(addInput({
        title: 'Read',
        dueDate: '2025-01-01',
        recurrence: { frequency: 'daily', interval: 1 },
      }))
      result.current.addTask(addInput({
        title: 'Read',
        dueDate: '2025-01-02',
        recurrence: { frequency: 'daily', interval: 1 },
      }))
    })
    expect(result.current.tasks).toHaveLength(2)

    const current = result.current.tasks.find(t => t.dueDate === '2025-01-01')!
    act(() => { result.current.toggleTask(current.id) })

    // Still 2 tasks — no third one created
    expect(result.current.tasks).toHaveLength(2)
    const uncompleted = result.current.tasks.filter(t => !t.completed)
    expect(uncompleted).toHaveLength(1)
    expect(uncompleted[0].dueDate).toBe('2025-01-02')
  })

  it('resets subtasks to uncompleted on the spawned instance', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({
        title: 'Read',
        dueDate: '2025-01-01',
        recurrence: { frequency: 'daily', interval: 1 },
      }))
    })
    // Manually complete a subtask before toggling
    const taskId = result.current.tasks[0].id
    act(() => { result.current.addSubtask(taskId, 'Chapter 1') })
    const subtaskId = result.current.tasks[0].subtasks[0].id
    act(() => { result.current.toggleSubtask(taskId, subtaskId) })

    act(() => { result.current.toggleTask(taskId) })

    const next = result.current.tasks.find(t => !t.completed)!
    expect(next.subtasks[0].completed).toBe(false)
  })
})

// ── clearList ─────────────────────────────────────────────────────────────────

describe('useTasks – clearList', () => {
  it('removes all inbox tasks (no listId)', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'Inbox task 1' }))
      result.current.addTask(addInput({ title: 'Inbox task 2' }))
      result.current.addTask(addInput({ title: 'List task', listId: 'list-a' }))
    })
    act(() => { result.current.clearList('inbox') })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('List task')
  })

  it('removes all tasks belonging to a specific list', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'List A task 1', listId: 'list-a' }))
      result.current.addTask(addInput({ title: 'List A task 2', listId: 'list-a' }))
      result.current.addTask(addInput({ title: 'Inbox task' }))
    })
    act(() => { result.current.clearList('list-a') })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Inbox task')
  })

  it('does not affect tasks in other lists', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'List A', listId: 'list-a' }))
      result.current.addTask(addInput({ title: 'List B', listId: 'list-b' }))
    })
    act(() => { result.current.clearList('list-a') })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].listId).toBe('list-b')
  })

  it('is a no-op when the list is already empty', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Inbox task' })) })
    act(() => { result.current.clearList('list-a') }) // list-a doesn't exist
    expect(result.current.tasks).toHaveLength(1)
  })
})

// ── deleteTask + undoDelete ───────────────────────────────────────────────────

describe('useTasks – deleteTask / undoDelete', () => {
  it('removes the task and sets lastDeleted', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Walk dog' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.deleteTask(id) })
    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.lastDeleted?.task.title).toBe('Walk dog')
  })

  it('restores the task at its original position on undo', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'Task A' }))
      result.current.addTask(addInput({ title: 'Task B' }))
    })
    const idA = result.current.tasks.find(t => t.title === 'Task A')!.id
    act(() => { result.current.deleteTask(idA) })
    act(() => { result.current.undoDelete() })
    const titles = result.current.tasks.map(t => t.title)
    expect(titles).toContain('Task A')
  })
})
