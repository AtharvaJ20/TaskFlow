import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFilters } from '../../hooks/useFilters'
import type { Task } from '../../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Task',
    completed: false,
    priority: 'medium',
    tags: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

const active   = makeTask({ title: 'Active',    completed: false, priority: 'low',    createdAt: '2025-01-01T00:00:00.000Z' })
const done     = makeTask({ title: 'Done',      completed: true,  priority: 'high',   createdAt: '2025-01-02T00:00:00.000Z', completedAt: new Date().toISOString() })
const withDate = makeTask({ title: 'Dated',     completed: false, priority: 'medium', createdAt: '2025-01-03T00:00:00.000Z', dueDate: '2025-06-01' })
const noDate   = makeTask({ title: 'No date',   completed: false, priority: 'medium', createdAt: '2025-01-04T00:00:00.000Z' })
const tagged   = makeTask({ title: 'Tagged',    completed: false, priority: 'medium', tags: ['work', 'urgent'] })

const allTasks = [active, done, withDate, noDate, tagged]

describe('useFilters – status filter', () => {
  it('returns all tasks when filter is "all"', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.applyFilters(allTasks)).toHaveLength(allTasks.length)
  })

  it('returns only incomplete tasks when filter is "active"', () => {
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setFilter('active') })

    const filtered = result.current.applyFilters(allTasks)
    expect(filtered.every(t => !t.completed)).toBe(true)
    expect(filtered.find(t => t.title === 'Done')).toBeUndefined()
  })

  it('returns only completed tasks when filter is "completed"', () => {
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setFilter('completed') })

    const filtered = result.current.applyFilters(allTasks)
    expect(filtered.every(t => t.completed)).toBe(true)
    expect(filtered).toHaveLength(1)
  })

  it('hides tasks completed on a previous day from the "all" view', () => {
    const { result } = renderHook(() => useFilters())

    const completedYesterday = makeTask({
      title: 'Old done',
      completed: true,
      completedAt: '2020-01-01T10:00:00.000Z',
    })
    const completedToday = makeTask({
      title: 'Just done',
      completed: true,
      completedAt: new Date().toISOString(),
    })
    const notDone = makeTask({ title: 'Active' })

    const filtered = result.current.applyFilters([completedYesterday, completedToday, notDone])
    expect(filtered.map(t => t.title)).not.toContain('Old done')
    expect(filtered.map(t => t.title)).toContain('Just done')
    expect(filtered.map(t => t.title)).toContain('Active')
  })
})

describe('useFilters – search', () => {
  it('filters by title (case-insensitive)', () => {
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setSearch('ACTIVE') })

    const filtered = result.current.applyFilters(allTasks)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Active')
  })

  it('filters by description', () => {
    const taskWithDesc = makeTask({ title: 'Misc', description: 'buy milk today' })
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setSearch('milk') })

    const filtered = result.current.applyFilters([taskWithDesc, active])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Misc')
  })

  it('filters by tag', () => {
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setSearch('urgent') })

    const filtered = result.current.applyFilters(allTasks)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Tagged')
  })

  it('returns all tasks when search is empty or whitespace', () => {
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setSearch('   ') })

    expect(result.current.applyFilters(allTasks)).toHaveLength(allTasks.length)
  })
})

describe('useFilters – sort', () => {
  it('sorts by createdAt descending (newest first) by default', () => {
    const { result } = renderHook(() => useFilters())

    const sorted = result.current.applyFilters([active, done, withDate, noDate])
    // noDate has latest createdAt (2025-01-04)
    expect(sorted[0].title).toBe('No date')
  })

  it('sorts by dueDate ascending with tasks that have dates first', () => {
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setSortBy('dueDate') })

    const early = makeTask({ title: 'Early', dueDate: '2025-03-01' })
    const late  = makeTask({ title: 'Late',  dueDate: '2025-12-01' })
    const none  = makeTask({ title: 'None' })

    const sorted = result.current.applyFilters([none, late, early])
    expect(sorted[0].title).toBe('Early')
    expect(sorted[1].title).toBe('Late')
    expect(sorted[2].title).toBe('None')
  })

  it('sorts by priority: high → medium → low', () => {
    const { result } = renderHook(() => useFilters())

    act(() => { result.current.setSortBy('priority') })

    const low    = makeTask({ title: 'Low',    priority: 'low' })
    const medium = makeTask({ title: 'Medium', priority: 'medium' })
    const high   = makeTask({ title: 'High',   priority: 'high' })

    const sorted = result.current.applyFilters([low, medium, high])
    expect(sorted[0].title).toBe('High')
    expect(sorted[1].title).toBe('Medium')
    expect(sorted[2].title).toBe('Low')
  })

  it('dueDate sort places undated tasks last when only one task has a date', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setSortBy('dueDate') })
    const withDue = makeTask({ title: 'HasDate', dueDate: '2025-06-01' })
    const noDue   = makeTask({ title: 'NoDate' })
    const sorted = result.current.applyFilters([noDue, withDue])
    expect(sorted[0].title).toBe('HasDate')
    expect(sorted[1].title).toBe('NoDate')
  })

  it('dueDate sort treats two undated tasks as equal order', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setSortBy('dueDate') })
    const a = makeTask({ title: 'A', createdAt: '2025-01-01T00:00:00Z' })
    const b = makeTask({ title: 'B', createdAt: '2025-01-02T00:00:00Z' })
    // Both undated — sort returns 0 so order is stable; just confirm both appear
    const sorted = result.current.applyFilters([a, b])
    expect(sorted.map(t => t.title)).toEqual(expect.arrayContaining(['A', 'B']))
  })

  it('pinned tasks sort before unpinned tasks regardless of other sort', () => {
    const { result } = renderHook(() => useFilters())
    const pinned   = makeTask({ title: 'Pinned',   pinned: true,  priority: 'low' })
    const unpinned = makeTask({ title: 'Unpinned', pinned: false, priority: 'high' })
    const sorted = result.current.applyFilters([unpinned, pinned])
    expect(sorted[0].title).toBe('Pinned')
  })
})

describe('useFilters – due date filter', () => {
  it('filters tasks with no due date when dueDateFilter is "no-date"', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setDueDateFilter('no-date') })
    const withDue = makeTask({ title: 'HasDate', dueDate: '2025-06-01' })
    const noDue   = makeTask({ title: 'NoDate' })
    const filtered = result.current.applyFilters([withDue, noDue])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('NoDate')
  })

  it('filters tasks due today when dueDateFilter is "today"', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setDueDateFilter('today') })
    const todayStr = new Date().toISOString().split('T')[0]
    const dueToday = makeTask({ title: 'Today', dueDate: todayStr })
    const dueLater = makeTask({ title: 'Later', dueDate: '2030-01-01' })
    const noDue    = makeTask({ title: 'None' })
    const filtered = result.current.applyFilters([dueToday, dueLater, noDue])
    expect(filtered.map(t => t.title)).toContain('Today')
    expect(filtered.map(t => t.title)).not.toContain('Later')
    expect(filtered.map(t => t.title)).not.toContain('None')
  })

  it('filters overdue tasks when dueDateFilter is "overdue"', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setDueDateFilter('overdue') })
    const overdue  = makeTask({ title: 'Overdue', dueDate: '2020-01-01' })
    const upcoming = makeTask({ title: 'Future',  dueDate: '2030-01-01' })
    const filtered = result.current.applyFilters([overdue, upcoming])
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Overdue')
  })

  it('excludes tasks with no due date from non-no-date filters', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setDueDateFilter('today') })
    const noDue = makeTask({ title: 'NoDue' })
    const filtered = result.current.applyFilters([noDue])
    expect(filtered).toHaveLength(0)
  })
})

describe('useFilters – tag and priority filter', () => {
  it('filters by tag when tagFilter is set', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setTagFilter('work') })
    const filtered = result.current.applyFilters(allTasks)
    expect(filtered.every(t => t.tags.includes('work'))).toBe(true)
  })

  it('filters by priority when priorityFilter is set', () => {
    const { result } = renderHook(() => useFilters())
    act(() => { result.current.setPriorityFilter('low') })
    const filtered = result.current.applyFilters(allTasks)
    expect(filtered.every(t => t.priority === 'low')).toBe(true)
  })

  it('activeFilterCount reflects active filters', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.activeFilterCount).toBe(0)
    act(() => { result.current.setDueDateFilter('today') })
    expect(result.current.activeFilterCount).toBe(1)
    act(() => { result.current.setPriorityFilter('high') })
    expect(result.current.activeFilterCount).toBe(2)
    act(() => { result.current.setTagFilter('work') })
    expect(result.current.activeFilterCount).toBe(3)
  })

  it('clearAdvancedFilters resets dueDateFilter, priorityFilter, and tagFilter', () => {
    const { result } = renderHook(() => useFilters())
    act(() => {
      result.current.setDueDateFilter('today')
      result.current.setPriorityFilter('high')
      result.current.setTagFilter('work')
    })
    act(() => { result.current.clearAdvancedFilters() })
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('passes through a dated task when dueDateFilter has an unrecognized value', () => {
    const { result } = renderHook(() => useFilters())
    // Bypass TypeScript type — covers the `return true` fallthrough on line 81
    act(() => { result.current.setDueDateFilter('custom' as never) })
    const task = makeTask({ dueDate: '2030-01-01' })
    const filtered = result.current.applyFilters([task])
    expect(filtered).toHaveLength(1)
  })
})
