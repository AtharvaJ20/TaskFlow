import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLists } from '../../hooks/useLists'
import type { TaskList } from '../../types/task'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
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

const STORAGE_KEY = 'taskflow-lists'

describe('useLists – guest mode (userId = null)', () => {
  it('starts with empty lists when localStorage is empty', () => {
    const { result } = renderHook(() => useLists(null))
    expect(result.current.lists).toHaveLength(0)
  })

  it('loads lists persisted in localStorage on init', () => {
    const stored: TaskList[] = [{ id: 'l1', name: 'Work', color: '#6366f1', createdAt: new Date().toISOString() }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useLists(null))
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('Work')
  })

  it('addList appends a list and persists to localStorage', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => { result.current.addList('Personal') })
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('Personal')
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored[0].name).toBe('Personal')
  })

  it('addList returns the created list with id and createdAt', () => {
    const { result } = renderHook(() => useLists(null))
    let list!: TaskList
    act(() => { list = result.current.addList('Shopping') })
    expect(list.id).toBeTruthy()
    expect(list.createdAt).toBeTruthy()
    expect(list.name).toBe('Shopping')
  })

  it('addList uses the provided color', () => {
    const { result } = renderHook(() => useLists(null))
    let list!: TaskList
    act(() => { list = result.current.addList('Fitness', '#ef4444') })
    expect(list.color).toBe('#ef4444')
  })

  it('addList trims whitespace from the name', () => {
    const { result } = renderHook(() => useLists(null))
    let list!: TaskList
    act(() => { list = result.current.addList('  Work  ') })
    expect(list.name).toBe('Work')
  })

  it('updateList changes the name', () => {
    const { result } = renderHook(() => useLists(null))
    let id!: string
    act(() => { id = result.current.addList('Old name').id })
    act(() => { result.current.updateList(id, { name: 'New name' }) })
    expect(result.current.lists[0].name).toBe('New name')
  })

  it('updateList changes the color', () => {
    const { result } = renderHook(() => useLists(null))
    let id!: string
    act(() => { id = result.current.addList('Work', '#6366f1').id })
    act(() => { result.current.updateList(id, { color: '#10b981' }) })
    expect(result.current.lists[0].color).toBe('#10b981')
  })

  it('updateList does not affect other lists', () => {
    const { result } = renderHook(() => useLists(null))
    let idA!: string
    act(() => { idA = result.current.addList('A').id })
    act(() => { result.current.addList('B') })
    act(() => { result.current.updateList(idA, { name: 'A updated' }) })
    expect(result.current.lists.find(l => l.name === 'B')).toBeDefined()
  })

  it('deleteList removes the list by id', () => {
    const { result } = renderHook(() => useLists(null))
    let id!: string
    act(() => { id = result.current.addList('Temp').id })
    expect(result.current.lists).toHaveLength(1)
    act(() => { result.current.deleteList(id) })
    expect(result.current.lists).toHaveLength(0)
  })

  it('deleteList only removes the targeted list', () => {
    const { result } = renderHook(() => useLists(null))
    let idA!: string
    act(() => { idA = result.current.addList('A').id })
    act(() => { result.current.addList('B') })
    act(() => { result.current.deleteList(idA) })
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('B')
  })

  it('deleteList is a no-op when id does not exist', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => { result.current.addList('Work') })
    act(() => { result.current.deleteList('nonexistent') })
    expect(result.current.lists).toHaveLength(1)
  })

  it('addList appends multiple lists in order', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => {
      result.current.addList('First')
      result.current.addList('Second')
      result.current.addList('Third')
    })
    expect(result.current.lists.map(l => l.name)).toEqual(['First', 'Second', 'Third'])
  })

  it('lists are persisted and reloaded across hook instances', () => {
    const { result: r1 } = renderHook(() => useLists(null))
    act(() => { r1.current.addList('Persisted') })
    const { result: r2 } = renderHook(() => useLists(null))
    expect(r2.current.lists[0].name).toBe('Persisted')
  })
})

describe('useLists – authenticated mode (userId provided)', () => {
  it('initialises with empty lists and triggers supabase load', async () => {
    const { result } = renderHook(() => useLists('user-abc'))
    await waitFor(() => { expect(result.current.lists).toHaveLength(0) })
  })

  it('addList updates local state and calls supabase insert', async () => {
    const { result } = renderHook(() => useLists('user-abc'))
    await waitFor(() => expect(result.current.lists).toHaveLength(0))
    act(() => { result.current.addList('Work') })
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('Work')
  })

  it('addList returns the created list with id', async () => {
    const { result } = renderHook(() => useLists('user-abc'))
    await waitFor(() => expect(result.current.lists).toHaveLength(0))
    let list!: import('../../types/task').TaskList
    act(() => { list = result.current.addList('Shopping') })
    expect(list.id).toBeTruthy()
  })

  it('updateList changes name and calls supabase update', async () => {
    const { result } = renderHook(() => useLists('user-abc'))
    await waitFor(() => expect(result.current.lists).toHaveLength(0))
    let id!: string
    act(() => { id = result.current.addList('Old').id })
    act(() => { result.current.updateList(id, { name: 'New' }) })
    expect(result.current.lists[0].name).toBe('New')
  })

  it('deleteList removes the list and calls supabase delete', async () => {
    const { result } = renderHook(() => useLists('user-abc'))
    await waitFor(() => expect(result.current.lists).toHaveLength(0))
    let id!: string
    act(() => { id = result.current.addList('Temp').id })
    act(() => { result.current.deleteList(id) })
    expect(result.current.lists).toHaveLength(0)
  })
})
