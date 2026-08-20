import { useEffect } from 'react'

interface Options {
  onEscape?: () => void
}

export function useKeyboardShortcuts({ onEscape }: Options) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isEditing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // Esc always fires — closes modal / clears search
      if (e.key === 'Escape') {
        onEscape?.()
        ;(document.activeElement as HTMLElement)?.blur()
        return
      }

      if (isEditing) return

      // n — focus new task input
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[aria-label="New task title"]')?.focus()
        return
      }

      // / — focus search
      if (e.key === '/') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[aria-label="Search tasks"]')?.focus()
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onEscape])
}
