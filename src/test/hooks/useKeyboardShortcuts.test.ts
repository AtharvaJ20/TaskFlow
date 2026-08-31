import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onEscape }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledOnce()
  })

  it('does not call onEscape when a non-Escape key is pressed', () => {
    const onEscape = vi.fn()
    renderHook(() => useKeyboardShortcuts({ onEscape }))
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('focuses the new task input when n is pressed', () => {
    const input = document.createElement('input')
    input.setAttribute('aria-label', 'New task title')
    document.body.appendChild(input)
    const focusSpy = vi.spyOn(input, 'focus')

    renderHook(() => useKeyboardShortcuts({}))
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(focusSpy).toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('focuses the search input when / is pressed', () => {
    const input = document.createElement('input')
    input.setAttribute('aria-label', 'Search tasks')
    document.body.appendChild(input)
    const focusSpy = vi.spyOn(input, 'focus')

    renderHook(() => useKeyboardShortcuts({}))
    fireEvent.keyDown(document.body, { key: '/' })
    expect(focusSpy).toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('does not focus task input when n is pressed inside an input (editing mode)', () => {
    const newTaskInput = document.createElement('input')
    newTaskInput.setAttribute('aria-label', 'New task title')
    document.body.appendChild(newTaskInput)
    const focusSpy = vi.spyOn(newTaskInput, 'focus')

    const editingInput = document.createElement('input')
    document.body.appendChild(editingInput)

    renderHook(() => useKeyboardShortcuts({}))
    // Fire keydown with target = editingInput (isEditing check fires)
    fireEvent.keyDown(editingInput, { key: 'n' })
    expect(focusSpy).not.toHaveBeenCalled()

    document.body.removeChild(newTaskInput)
    document.body.removeChild(editingInput)
  })

  it('removes the event listener on unmount', () => {
    const onEscape = vi.fn()
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onEscape }))
    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onEscape).not.toHaveBeenCalled()
  })
})
