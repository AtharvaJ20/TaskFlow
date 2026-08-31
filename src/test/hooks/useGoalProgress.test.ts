import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGoalProgress } from '../../hooks/useGoalProgress'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

const KEY = 'taskflow-goal-progress'

beforeEach(() => { localStorage.clear() })

describe('useGoalProgress – guest mode (userId = null)', () => {
  it('starts with empty entries when localStorage is empty', () => {
    const { result } = renderHook(() => useGoalProgress(null))
    expect(result.current.entries).toHaveLength(0)
  })

  it('loads entries from localStorage on mount', () => {
    const stored = [{ id: 'e1', goalId: 'g1', value: 10, loggedAt: new Date().toISOString() }]
    localStorage.setItem(KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useGoalProgress(null))
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].goalId).toBe('g1')
  })

  it('addEntry adds a new entry with the given goalId and value', () => {
    const { result } = renderHook(() => useGoalProgress(null))
    act(() => {
      result.current.addEntry('goal-1', 42)
    })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].goalId).toBe('goal-1')
    expect(result.current.entries[0].value).toBe(42)
  })

  it('addEntry returns the new entry object', () => {
    const { result } = renderHook(() => useGoalProgress(null))
    let returned: ReturnType<typeof result.current.addEntry> | undefined
    act(() => {
      returned = result.current.addEntry('goal-x', 99, 'great run')
    })
    expect(returned?.goalId).toBe('goal-x')
    expect(returned?.value).toBe(99)
    expect(returned?.note).toBe('great run')
    expect(returned?.id).toBeTruthy()
  })

  it('addEntry persists entries to localStorage', () => {
    const { result } = renderHook(() => useGoalProgress(null))
    act(() => { result.current.addEntry('g1', 5) })
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].value).toBe(5)
  })

  it('deleteEntry removes the entry by id', () => {
    const { result } = renderHook(() => useGoalProgress(null))
    let entryId = ''
    act(() => {
      const e = result.current.addEntry('g1', 10)
      entryId = e.id
    })
    act(() => { result.current.deleteEntry(entryId) })
    expect(result.current.entries).toHaveLength(0)
  })

  it('deleteEntry is a no-op for an unknown id', () => {
    const { result } = renderHook(() => useGoalProgress(null))
    act(() => { result.current.addEntry('g1', 10) })
    act(() => { result.current.deleteEntry('nonexistent') })
    expect(result.current.entries).toHaveLength(1)
  })

  it('multiple addEntry calls accumulate entries', () => {
    const { result } = renderHook(() => useGoalProgress(null))
    act(() => {
      result.current.addEntry('g1', 1)
      result.current.addEntry('g1', 2)
      result.current.addEntry('g2', 3)
    })
    expect(result.current.entries).toHaveLength(3)
  })
})

describe('useGoalProgress – authenticated mode (userId provided)', () => {
  it('starts with empty entries and triggers supabase load', async () => {
    const { result } = renderHook(() => useGoalProgress('user-abc'))
    await act(async () => {})
    expect(result.current.entries).toHaveLength(0)
  })

  it('addEntry updates local state in authenticated mode', () => {
    const { result } = renderHook(() => useGoalProgress('user-abc'))
    act(() => { result.current.addEntry('goal-auth', 55) })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].value).toBe(55)
  })

  it('deleteEntry removes entry in authenticated mode', () => {
    const { result } = renderHook(() => useGoalProgress('user-abc'))
    let id = ''
    act(() => { id = result.current.addEntry('g1', 10).id })
    act(() => { result.current.deleteEntry(id) })
    expect(result.current.entries).toHaveLength(0)
  })
})
