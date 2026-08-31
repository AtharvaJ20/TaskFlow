import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useTheme } from '../../hooks/useTheme'

afterEach(() => {
  localStorage.removeItem('todo-theme')
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('adds "dark" class to documentElement when initialized in dark mode', () => {
    localStorage.setItem('todo-theme', 'dark')
    renderHook(() => useTheme())
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes "dark" class when initialized in light mode', () => {
    document.documentElement.classList.add('dark')
    localStorage.setItem('todo-theme', 'light')
    renderHook(() => useTheme())
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggleTheme switches from light to dark', () => {
    localStorage.setItem('todo-theme', 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(false)
    act(() => { result.current.toggleTheme() })
    expect(result.current.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
