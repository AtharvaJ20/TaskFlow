import { useState, useEffect } from 'react'

const TOUR_KEY = 'taskflow-toured'

export function useTour() {
  const [step, setStep] = useState<number | null>(null)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so the app renders first
      const t = setTimeout(() => setStep(0), 600)
      return () => clearTimeout(t)
    }
  }, [])

  function next(total: number) {
    setStep(s => {
      if (s === null) return null
      if (s >= total - 1) { dismiss(); return null }
      return s + 1
    })
  }

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    setStep(null)
  }

  return { step, next, dismiss }
}
