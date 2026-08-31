import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoals } from '../../hooks/useGoals'
import type { Goal } from '../../types/task'

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

const STORAGE_KEY = 'taskflow-goals'

function goalInput(overrides: Partial<Omit<Goal, 'id' | 'createdAt'>> = {}): Omit<Goal, 'id' | 'createdAt'> {
  return {
    title: 'Run a marathon',
    deadline: '2026-12-31',
    color: '#6366f1',
    goalType: 'task',
    ...overrides,
  }
}

describe('useGoals – guest mode (userId = null)', () => {
  it('starts with empty goals when localStorage is empty', () => {
    const { result } = renderHook(() => useGoals(null))
    expect(result.current.goals).toHaveLength(0)
  })

  it('loads goals persisted in localStorage on init', () => {
    const stored: Goal[] = [{
      id: 'g1', title: 'Existing goal', deadline: '2026-01-01',
      color: '#fff', createdAt: new Date().toISOString(), goalType: 'task',
    }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useGoals(null))
    expect(result.current.goals).toHaveLength(1)
    expect(result.current.goals[0].title).toBe('Existing goal')
  })

  it('defaults goalType to "task" when missing from localStorage', () => {
    const stored = [{ id: 'g1', title: 'Old', deadline: '2026-01-01', color: '#fff', createdAt: new Date().toISOString() }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useGoals(null))
    expect(result.current.goals[0].goalType).toBe('task')
  })

  it('addGoal appends the goal to state', () => {
    const { result } = renderHook(() => useGoals(null))
    act(() => { result.current.addGoal(goalInput()) })
    expect(result.current.goals).toHaveLength(1)
    expect(result.current.goals[0].title).toBe('Run a marathon')
  })

  it('addGoal assigns a unique id and createdAt', () => {
    const { result } = renderHook(() => useGoals(null))
    let g1: Goal, g2: Goal
    act(() => { g1 = result.current.addGoal(goalInput({ title: 'Goal A' })) })
    act(() => { g2 = result.current.addGoal(goalInput({ title: 'Goal B' })) })
    expect(g1!.id).not.toBe(g2!.id)
    expect(g1!.createdAt).toBeTruthy()
  })

  it('addGoal persists goals to localStorage', () => {
    const { result } = renderHook(() => useGoals(null))
    act(() => { result.current.addGoal(goalInput()) })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].title).toBe('Run a marathon')
  })

  it('updateGoal changes title of an existing goal', () => {
    const { result } = renderHook(() => useGoals(null))
    let id: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    act(() => { result.current.updateGoal(id!, { title: 'Walk a marathon' }) })
    expect(result.current.goals[0].title).toBe('Walk a marathon')
  })

  it('updateGoal changes color of an existing goal', () => {
    const { result } = renderHook(() => useGoals(null))
    let id: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    act(() => { result.current.updateGoal(id!, { color: '#ff0000' }) })
    expect(result.current.goals[0].color).toBe('#ff0000')
  })

  it('updateGoal does not affect other goals', () => {
    const { result } = renderHook(() => useGoals(null))
    let idA: string
    act(() => { idA = result.current.addGoal(goalInput({ title: 'A' })).id })
    act(() => { result.current.addGoal(goalInput({ title: 'B' })) })
    act(() => { result.current.updateGoal(idA!, { title: 'A updated' }) })
    expect(result.current.goals.find(g => g.title === 'B')).toBeDefined()
  })

  it('deleteGoal removes the goal by id', () => {
    const { result } = renderHook(() => useGoals(null))
    let id: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    expect(result.current.goals).toHaveLength(1)
    act(() => { result.current.deleteGoal(id!) })
    expect(result.current.goals).toHaveLength(0)
  })

  it('deleteGoal only removes the targeted goal', () => {
    const { result } = renderHook(() => useGoals(null))
    let idA: string
    act(() => { idA = result.current.addGoal(goalInput({ title: 'A' })).id })
    act(() => { result.current.addGoal(goalInput({ title: 'B' })) })
    act(() => { result.current.deleteGoal(idA!) })
    expect(result.current.goals).toHaveLength(1)
    expect(result.current.goals[0].title).toBe('B')
  })

  it('supports metric goalType with startValue, targetValue, and unit', () => {
    const { result } = renderHook(() => useGoals(null))
    act(() => {
      result.current.addGoal(goalInput({
        goalType: 'metric',
        startValue: 0,
        targetValue: 100,
        unit: 'km',
      }))
    })
    const g = result.current.goals[0]
    expect(g.goalType).toBe('metric')
    expect(g.startValue).toBe(0)
    expect(g.targetValue).toBe(100)
    expect(g.unit).toBe('km')
  })

  it('updateGoal changes the deadline', () => {
    const { result } = renderHook(() => useGoals(null))
    let id: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    act(() => { result.current.updateGoal(id!, { deadline: '2028-06-15' }) })
    expect(result.current.goals[0].deadline).toBe('2028-06-15')
  })

  it('updateGoal preserves fields not included in changes', () => {
    const { result } = renderHook(() => useGoals(null))
    let id: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    act(() => { result.current.updateGoal(id!, { color: '#ef4444' }) })
    expect(result.current.goals[0].title).toBe('Run a marathon')
    expect(result.current.goals[0].deadline).toBe('2026-12-31')
  })

  it('addGoal appends to existing goals, preserving order', () => {
    const { result } = renderHook(() => useGoals(null))
    act(() => {
      result.current.addGoal(goalInput({ title: 'First' }))
      result.current.addGoal(goalInput({ title: 'Second' }))
      result.current.addGoal(goalInput({ title: 'Third' }))
    })
    expect(result.current.goals.map(g => g.title)).toEqual(['First', 'Second', 'Third'])
  })

  it('deleteGoal is a no-op when id does not exist', () => {
    const { result } = renderHook(() => useGoals(null))
    act(() => { result.current.addGoal(goalInput()) })
    act(() => { result.current.deleteGoal('nonexistent-id') })
    expect(result.current.goals).toHaveLength(1)
  })

  it('updateGoal updates metric fields', () => {
    const { result } = renderHook(() => useGoals(null))
    let id: string
    act(() => { id = result.current.addGoal(goalInput({ goalType: 'metric', startValue: 0, targetValue: 50, unit: 'kg' })).id })
    act(() => { result.current.updateGoal(id!, { targetValue: 75, unit: 'lbs' }) })
    expect(result.current.goals[0].targetValue).toBe(75)
    expect(result.current.goals[0].unit).toBe('lbs')
  })
})

describe('useGoals – authenticated mode (userId provided)', () => {
  it('initialises with empty goals and triggers supabase load', async () => {
    const { result } = renderHook(() => useGoals('user-abc'))
    await waitFor(() => { expect(result.current.goals).toHaveLength(0) })
  })

  it('addGoal updates local state and calls supabase insert', async () => {
    const { result } = renderHook(() => useGoals('user-abc'))
    await waitFor(() => expect(result.current.goals).toHaveLength(0))
    act(() => { result.current.addGoal(goalInput()) })
    expect(result.current.goals).toHaveLength(1)
  })

  it('updateGoal updates local state and calls supabase update', async () => {
    const { result } = renderHook(() => useGoals('user-abc'))
    await waitFor(() => expect(result.current.goals).toHaveLength(0))
    let id!: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    act(() => { result.current.updateGoal(id, { title: 'Updated' }) })
    expect(result.current.goals[0].title).toBe('Updated')
  })

  it('updateGoal patches description field', async () => {
    const { result } = renderHook(() => useGoals('user-abc'))
    await waitFor(() => expect(result.current.goals).toHaveLength(0))
    let id!: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    act(() => { result.current.updateGoal(id, { description: 'some notes' }) })
    expect(result.current.goals[0].description).toBe('some notes')
  })

  it('deleteGoal removes goal from local state and calls supabase delete', async () => {
    const { result } = renderHook(() => useGoals('user-abc'))
    await waitFor(() => expect(result.current.goals).toHaveLength(0))
    let id!: string
    act(() => { id = result.current.addGoal(goalInput()).id })
    expect(result.current.goals).toHaveLength(1)
    act(() => { result.current.deleteGoal(id) })
    expect(result.current.goals).toHaveLength(0)
  })

  it('updateGoal patches metric fields (startValue, targetValue, unit)', async () => {
    const { result } = renderHook(() => useGoals('user-abc'))
    await waitFor(() => expect(result.current.goals).toHaveLength(0))
    let id!: string
    act(() => { id = result.current.addGoal(goalInput({ goalType: 'metric', startValue: 0, targetValue: 50, unit: 'kg' })).id })
    act(() => { result.current.updateGoal(id, { startValue: 5, targetValue: 100, unit: 'lbs' }) })
    expect(result.current.goals[0].startValue).toBe(5)
    expect(result.current.goals[0].targetValue).toBe(100)
  })
})
