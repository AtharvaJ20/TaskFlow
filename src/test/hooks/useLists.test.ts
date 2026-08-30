import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLists, LIST_COLORS } from '../../hooks/useLists'
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
    const stored: TaskList[] = [{
      id: 'l1', name: 'Work', color: '#6366f1', createdAt: new Date().toISOString(),
    }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useLists(null))
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('Work')
  })

  it('addList appends the list to state', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => { result.current.addList('Shopping') })
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('Shopping')
  })

  it('addList trims whitespace from the name', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => { result.current.addList('  Home  ') })
    expect(result.current.lists[0].name).toBe('Home')
  })

  it('addList uses LIST_COLORS[0] as default color', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => { result.current.addList('Personal') })
    expect(result.current.lists[0].color).toBe(LIST_COLORS[0])
  })

  it('addList accepts a custom color', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => { result.current.addList('Projects', '#ff0000') })
    expect(result.current.lists[0].color).toBe('#ff0000')
  })

  it('addList assigns a unique id and createdAt', () => {
    const { result } = renderHook(() => useLists(null))
    let l1: TaskList, l2: TaskList
    act(() => { l1 = result.current.addList('A') })
    act(() => { l2 = result.current.addList('B') })
    expect(l1!.id).not.toBe(l2!.id)
    expect(l1!.createdAt).toBeTruthy()
  })

  it('addList persists to localStorage', () => {
    const { result } = renderHook(() => useLists(null))
    act(() => { result.current.addList('Errands') })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored[0].name).toBe('Errands')
  })

  it('updateList changes the name of an existing list', () => {
    const { result } = renderHook(() => useLists(null))
    let id: string
    act(() => { id = result.current.addList('Old Name').id })
    act(() => { result.current.updateList(id!, { name: 'New Name' }) })
    expect(result.current.lists[0].name).toBe('New Name')
  })

  it('updateList changes the color of an existing list', () => {
    const { result } = renderHook(() => useLists(null))
    let id: string
    act(() => { id = result.current.addList('Work').id })
    act(() => { result.current.updateList(id!, { color: '#10b981' }) })
    expect(result.current.lists[0].color).toBe('#10b981')
  })

  it('updateList does not affect other lists', () => {
    const { result } = renderHook(() => useLists(null))
    let idA: string
    act(() => { idA = result.current.addList('A').id })
    act(() => { result.current.addList('B') })
    act(() => { result.current.updateList(idA!, { name: 'A updated' }) })
    expect(result.current.lists.find(l => l.name === 'B')).toBeDefined()
  })

  it('deleteList removes the list by id', () => {
    const { result } = renderHook(() => useLists(null))
    let id: string
    act(() => { id = result.current.addList('Temp').id })
    act(() => { result.current.deleteList(id!) })
    expect(result.current.lists).toHaveLength(0)
  })

  it('deleteList only removes the targeted list', () => {
    const { result } = renderHook(() => useLists(null))
    let idA: string
    act(() => { idA = result.current.addList('A').id })
    act(() => { result.current.addList('B') })
    act(() => { result.current.deleteList(idA!) })
    expect(result.current.lists).toHaveLength(1)
    expect(result.current.lists[0].name).toBe('B')
  })
})
