import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { supabase } from '../../lib/supabase'
import { useTour } from '../../hooks/useTour'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      updateUser: vi.fn().mockResolvedValue({}),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

const TOUR_KEY = 'taskflow-toured'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTour – guest mode (userId = null)', () => {
  it('step is null initially when tour has already been seen', () => {
    localStorage.setItem(TOUR_KEY, '1')
    const { result } = renderHook(() => useTour(null))
    expect(result.current.step).toBeNull()
  })

  it('step becomes 0 after 600ms when tour has not been seen', () => {
    const { result } = renderHook(() => useTour(null))
    expect(result.current.step).toBeNull()
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.step).toBe(0)
  })

  it('sets localStorage toured flag when tour starts', () => {
    renderHook(() => useTour(null))
    act(() => { vi.advanceTimersByTime(600) })
    expect(localStorage.getItem(TOUR_KEY)).toBe('1')
  })

  it('next() advances step from 0 to 1', () => {
    const { result } = renderHook(() => useTour(null))
    act(() => { vi.advanceTimersByTime(600) })
    act(() => { result.current.next(5) })
    expect(result.current.step).toBe(1)
  })

  it('next() dismisses tour when on the last step', () => {
    const { result } = renderHook(() => useTour(null))
    act(() => { vi.advanceTimersByTime(600) })
    act(() => { result.current.next(1) })
    expect(result.current.step).toBeNull()
  })

  it('next() is a no-op when step is null', () => {
    localStorage.setItem(TOUR_KEY, '1')
    const { result } = renderHook(() => useTour(null))
    act(() => { result.current.next(3) })
    expect(result.current.step).toBeNull()
  })

  it('dismiss() sets step to null', () => {
    const { result } = renderHook(() => useTour(null))
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.step).toBe(0)
    act(() => { result.current.dismiss() })
    expect(result.current.step).toBeNull()
  })

  it('dismiss() persists toured flag to localStorage', () => {
    const { result } = renderHook(() => useTour(null))
    act(() => { vi.advanceTimersByTime(600) })
    act(() => { result.current.dismiss() })
    expect(localStorage.getItem(TOUR_KEY)).toBe('1')
  })

  it('reset() re-shows the tour after 300ms', () => {
    localStorage.setItem(TOUR_KEY, '1')
    const { result } = renderHook(() => useTour(null))
    expect(result.current.step).toBeNull()
    act(() => { result.current.reset() })
    expect(result.current.step).toBeNull()
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current.step).toBe(0)
  })

  it('reset() removes toured flag from localStorage', () => {
    localStorage.setItem(TOUR_KEY, '1')
    const { result } = renderHook(() => useTour(null))
    act(() => { result.current.reset() })
    expect(localStorage.getItem(TOUR_KEY)).toBeNull()
  })
})

describe('useTour – authenticated mode (userId provided)', () => {
  it('calls supabase.auth.getUser when userId is provided', () => {
    ;(supabase.auth.getUser as Mock).mockResolvedValueOnce({
      data: { user: { user_metadata: { toured: true } } },
    })
    renderHook(() => useTour('user-abc'))
    expect(supabase.auth.getUser).toHaveBeenCalled()
  })

  it('dismiss() calls supabase.auth.updateUser when userId is set', () => {
    ;(supabase.auth.getUser as Mock).mockResolvedValueOnce({
      data: { user: null },
    })
    const updateUserMock = supabase.auth.updateUser as Mock
    const { result } = renderHook(() => useTour('user-auth'))
    act(() => { result.current.dismiss() })
    expect(updateUserMock).toHaveBeenCalledWith({ data: { toured: true } })
  })

  it('reset() calls supabase.auth.updateUser when userId is set', () => {
    ;(supabase.auth.getUser as Mock).mockResolvedValueOnce({
      data: { user: { user_metadata: { toured: true } } },
    })
    localStorage.setItem(TOUR_KEY, '1')
    const updateUserMock = supabase.auth.updateUser as Mock
    const { result } = renderHook(() => useTour('user-xyz'))
    act(() => { result.current.reset() })
    expect(updateUserMock).toHaveBeenCalledWith({ data: { toured: false } })
  })

  it('shows tour after 600ms when authenticated user has not been toured', async () => {
    ;(supabase.auth.getUser as Mock).mockResolvedValueOnce({
      data: { user: { user_metadata: {} } }, // no toured flag
    })
    const { result } = renderHook(() => useTour('user-new'))
    await act(async () => {}) // flush the getUser() Promise
    expect(result.current.step).toBeNull()
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current.step).toBe(0)
  })
})
