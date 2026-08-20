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
const done     = makeTask({ title: 'Done',      completed: true,  priority: 'high',   createdAt: '2025-01-02T00:00:00.000Z' })
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
})
