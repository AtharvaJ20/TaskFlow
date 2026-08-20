import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AuthMode = 'checking' | 'auth' | 'guest' | 'user'

const GUEST_KEY = 'taskflow-guest'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [mode, setMode] = useState<AuthMode>('checking')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setMode('user')
      } else if (localStorage.getItem(GUEST_KEY)) {
        setMode('guest')
      } else {
        setMode('auth')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user)
        setMode('user')
      } else {
        setUser(null)
        setMode(localStorage.getItem(GUEST_KEY) ? 'guest' : 'auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string): Promise<'confirm' | 'done'> {
    setAuthError(null)
    const redirectTo = `${window.location.origin}/`
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
    if (error) { setAuthError(error.message); throw error }
    return data.session ? 'done' : 'confirm'
  }

  async function signIn(email: string, password: string) {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setAuthError(error.message); throw error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem(GUEST_KEY)
    setUser(null)
    setMode('auth')
  }

  function continueAsGuest() {
    localStorage.setItem(GUEST_KEY, '1')
    setMode('guest')
  }

  function clearAuthError() {
    setAuthError(null)
  }

  return { user, mode, authError, signUp, signIn, signOut, continueAsGuest, clearAuthError }
}
