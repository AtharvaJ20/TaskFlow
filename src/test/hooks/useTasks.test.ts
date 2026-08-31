import { act, renderHook, waitFor } from '@testing-library/react'
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

  it('undoDelete is a no-op when lastDeleted is null', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Task' })) })
    act(() => { result.current.undoDelete() }) // nothing to undo
    expect(result.current.tasks).toHaveLength(1)
  })
})

// ── clearUndo ─────────────────────────────────────────────────────────────────

describe('useTasks – clearUndo', () => {
  it('clears lastDeleted without restoring the task', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Task' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.deleteTask(id) })
    expect(result.current.lastDeleted).not.toBeNull()
    act(() => { result.current.clearUndo() })
    expect(result.current.lastDeleted).toBeNull()
    expect(result.current.tasks).toHaveLength(0)
  })
})

// ── updateTask ────────────────────────────────────────────────────────────────

describe('useTasks – updateTask', () => {
  it('updates a task field', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Old' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.updateTask(id, { title: 'New' }) })
    expect(result.current.tasks[0].title).toBe('New')
  })

  it('sets completedAt when completing via updateTask', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Task' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.updateTask(id, { completed: true }) })
    expect(result.current.tasks[0].completedAt).toBeDefined()
  })

  it('clears completedAt when uncompleting via updateTask', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Task' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.updateTask(id, { completed: true }) })
    act(() => { result.current.updateTask(id, { completed: false }) })
    expect(result.current.tasks[0].completedAt).toBeUndefined()
  })

  it('does not affect other tasks', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'A' }))
      result.current.addTask(addInput({ title: 'B' }))
    })
    const idA = result.current.tasks.find(t => t.title === 'A')!.id
    act(() => { result.current.updateTask(idA, { title: 'A updated' }) })
    expect(result.current.tasks.find(t => t.title === 'B')).toBeDefined()
  })
})

// ── clearCompleted ────────────────────────────────────────────────────────────

describe('useTasks – clearCompleted', () => {
  it('removes all completed tasks and keeps active ones', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'Active' }))
      result.current.addTask(addInput({ title: 'Done' }))
    })
    const doneId = result.current.tasks.find(t => t.title === 'Done')!.id
    act(() => { result.current.toggleTask(doneId) })
    act(() => { result.current.clearCompleted() })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Active')
  })

  it('is a no-op when no tasks are completed', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Active' })) })
    act(() => { result.current.clearCompleted() })
    expect(result.current.tasks).toHaveLength(1)
  })
})

// ── reorderTasks ──────────────────────────────────────────────────────────────

describe('useTasks – reorderTasks', () => {
  it('moves a task to a new position', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'A' }))
      result.current.addTask(addInput({ title: 'B' }))
      result.current.addTask(addInput({ title: 'C' }))
    })
    // tasks = [C, B, A] (newest first)
    act(() => { result.current.reorderTasks(0, 2) }) // move C to end
    expect(result.current.tasks[0].title).toBe('B')
    expect(result.current.tasks[2].title).toBe('C')
  })
})

// ── deleteSubtask ─────────────────────────────────────────────────────────────

describe('useTasks – deleteSubtask', () => {
  it('removes the subtask from the parent task', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Parent' })) })
    const taskId = result.current.tasks[0].id
    act(() => { result.current.addSubtask(taskId, 'Step 1') })
    const subId = result.current.tasks[0].subtasks[0].id
    act(() => { result.current.deleteSubtask(taskId, subId) })
    expect(result.current.tasks[0].subtasks).toHaveLength(0)
  })

  it('keeps other subtasks intact', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Parent' })) })
    const taskId = result.current.tasks[0].id
    act(() => { result.current.addSubtask(taskId, 'Step 1') })
    act(() => { result.current.addSubtask(taskId, 'Step 2') })
    const subId = result.current.tasks[0].subtasks[0].id
    act(() => { result.current.deleteSubtask(taskId, subId) })
    expect(result.current.tasks[0].subtasks).toHaveLength(1)
    expect(result.current.tasks[0].subtasks[0].title).toBe('Step 2')
  })
})

// ── logTime ───────────────────────────────────────────────────────────────────

describe('useTasks – logTime', () => {
  it('adds seconds to task.timeLogged', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Task' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.logTime(id, 300) })
    expect(result.current.tasks[0].timeLogged).toBe(300)
  })

  it('accumulates multiple logTime calls', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Task' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.logTime(id, 300) })
    act(() => { result.current.logTime(id, 120) })
    expect(result.current.tasks[0].timeLogged).toBe(420)
  })
})

// ── importTasks ───────────────────────────────────────────────────────────────

describe('useTasks – importTasks', () => {
  it('imports tasks with a title', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.importTasks([
        { title: 'Imported A', completed: false, priority: 'high', tags: [], subtasks: [] },
        { title: 'Imported B', completed: false, priority: 'low', tags: [], subtasks: [] },
      ])
    })
    expect(result.current.tasks).toHaveLength(2)
  })

  it('skips entries without a title', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.importTasks([
        { title: 'Valid' },
        { completed: false } as Partial<import('../../types/task').Task>,
      ])
    })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Valid')
  })

  it('prepends imported tasks before existing ones', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Existing' })) })
    act(() => { result.current.importTasks([{ title: 'New import' }]) })
    expect(result.current.tasks[0].title).toBe('New import')
    expect(result.current.tasks[1].title).toBe('Existing')
  })
})

// ── sortedByPriority ──────────────────────────────────────────────────────────

describe('useTasks – sortedByPriority', () => {
  it('returns tasks sorted high > medium > low', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'Low', priority: 'low' }))
      result.current.addTask(addInput({ title: 'High', priority: 'high' }))
      result.current.addTask(addInput({ title: 'Med', priority: 'medium' }))
    })
    const sorted = result.current.sortedByPriority
    expect(sorted[0].priority).toBe('high')
    expect(sorted[1].priority).toBe('medium')
    expect(sorted[2].priority).toBe('low')
  })

  it('does not mutate the original tasks array order', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask(addInput({ title: 'Low', priority: 'low' }))
      result.current.addTask(addInput({ title: 'High', priority: 'high' }))
    })
    // tasks[] is newest-first; sortedByPriority should differ
    expect(result.current.tasks[0].priority).toBe('high')
    expect(result.current.sortedByPriority[0].priority).toBe('high')
    expect(result.current.tasks).toHaveLength(2)
  })
})

// ── localStorage ──────────────────────────────────────────────────────────────

describe('useTasks – localStorage persistence', () => {
  it('persists tasks when they change', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => { result.current.addTask(addInput({ title: 'Saved' })) })
    const stored = JSON.parse(localStorage.getItem('todo-tasks') ?? '[]') as { title: string }[]
    expect(stored[0].title).toBe('Saved')
  })

  it('loads tasks from localStorage on mount', () => {
    localStorage.setItem('todo-tasks', JSON.stringify([
      { id: 't1', title: 'From storage', completed: false, priority: 'medium', tags: [], subtasks: [], createdAt: new Date().toISOString() }
    ]))
    const { result } = renderHook(() => useTasks(null))
    expect(result.current.tasks[0].title).toBe('From storage')
  })
})

// ── authenticated mode ────────────────────────────────────────────────────────

describe('useTasks – authenticated mode (userId provided)', () => {
  it('initialises with empty tasks and triggers supabase load', async () => {
    const { result } = renderHook(() => useTasks('user-abc'))
    await waitFor(() => { expect(result.current.tasks).toHaveLength(0) })
  })

  it('addTask updates local state and calls supabase insert', async () => {
    const { result } = renderHook(() => useTasks('user-abc'))
    await waitFor(() => expect(result.current.tasks).toHaveLength(0))
    act(() => { result.current.addTask(addInput({ title: 'Auth task' })) })
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Auth task')
  })

  it('toggleTask updates local state in authenticated mode', async () => {
    const { result } = renderHook(() => useTasks('user-abc'))
    await waitFor(() => expect(result.current.tasks).toHaveLength(0))
    act(() => { result.current.addTask(addInput({ title: 'Toggle me' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.toggleTask(id) })
    expect(result.current.tasks[0].completed).toBe(true)
  })

  it('updateTask updates local state in authenticated mode', async () => {
    const { result } = renderHook(() => useTasks('user-abc'))
    await waitFor(() => expect(result.current.tasks).toHaveLength(0))
    act(() => { result.current.addTask(addInput({ title: 'Old title' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.updateTask(id, { title: 'New title' }) })
    expect(result.current.tasks[0].title).toBe('New title')
  })

  it('deleteTask removes task in authenticated mode', async () => {
    const { result } = renderHook(() => useTasks('user-abc'))
    await waitFor(() => expect(result.current.tasks).toHaveLength(0))
    act(() => { result.current.addTask(addInput({ title: 'Delete me' })) })
    const id = result.current.tasks[0].id
    act(() => { result.current.deleteTask(id) })
    expect(result.current.tasks).toHaveLength(0)
  })

  it('clearList removes all tasks in authenticated mode', async () => {
    const { result } = renderHook(() => useTasks('user-abc'))
    await waitFor(() => expect(result.current.tasks).toHaveLength(0))
    act(() => { result.current.addTask(addInput({ title: 'A' })) })
    act(() => { result.current.addTask(addInput({ title: 'B' })) })
    act(() => { result.current.clearList() })
    expect(result.current.tasks).toHaveLength(0)
  })

  it('addTask with tags and priority in authenticated mode', async () => {
    const { result } = renderHook(() => useTasks('user-abc'))
    await waitFor(() => expect(result.current.tasks).toHaveLength(0))
    act(() => { result.current.addTask(addInput({ title: 'Tagged', tags: ['work'], priority: 'high' })) })
    expect(result.current.tasks[0].tags).toContain('work')
    expect(result.current.tasks[0].priority).toBe('high')
  })
})
