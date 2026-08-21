import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const TOUR_KEY = 'taskflow-toured'

export function useTour(userId: string | null) {
  const [step, setStep] = useState<number | null>(null)
  // Track whether we've checked the cloud state for this user already
  const syncedRef = useRef<string | null>(null)

  useEffect(() => {
    // Guest or already synced for this user — use localStorage only
    if (!userId) {
      if (!localStorage.getItem(TOUR_KEY)) {
        const t = setTimeout(() => {
          localStorage.setItem(TOUR_KEY, '1')
          setStep(0)
        }, 600)
        return () => clearTimeout(t)
      }
      return
    }

    // Already synced for this user in this session
    if (syncedRef.current === userId) return
    syncedRef.current = userId

    // For logged-in users: check Supabase user metadata first
    supabase.auth.getUser().then(({ data }) => {
      const toured = data.user?.user_metadata?.toured
      if (toured) {
        // Mark locally so we never check again on this device
        localStorage.setItem(TOUR_KEY, '1')
      } else if (!localStorage.getItem(TOUR_KEY)) {
        // Neither cloud nor local has toured — show the tour
        setTimeout(() => {
          localStorage.setItem(TOUR_KEY, '1')
          setStep(0)
        }, 600)
      }
    })
  }, [userId])

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
    // Persist across devices for logged-in users
    if (userId) {
      supabase.auth.updateUser({ data: { toured: true } })
    }
  }

  return { step, next, dismiss }
}
