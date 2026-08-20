import { useState } from 'react'

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<'confirm' | 'done'>
  onGuest: () => void
  error: string | null
}

export default function AuthScreen({ onSignIn, onSignUp, onGuest, error }: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (tab === 'login') {
        await onSignIn(email, password)
      } else {
        const result = await onSignUp(email, password)
        if (result === 'confirm') setConfirmSent(true)
      }
    } catch {
      // error is shown via prop
    } finally {
      setLoading(false)
    }
  }

  if (confirmSent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-accent-600 dark:text-accent-400" aria-hidden="true">
              <path d="M3 8l9 6 9-6M3 8v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8M3 8a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Check your email</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and log in.
          </p>
          <button
            type="button"
            onClick={() => { setConfirmSent(false); setTab('login') }}
            className="mt-2 text-sm text-accent-600 dark:text-accent-400 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-accent-600 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" aria-hidden="true">
              <path d="M9 12l2 2 4-4M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">TaskFlow</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your tasks, everywhere</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors focus:outline-none ${
                  tab === t
                    ? 'text-accent-600 dark:text-accent-400 border-b-2 border-accent-600 dark:border-accent-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-500 transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-gray-600 dark:text-gray-400">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                minLength={6}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-60 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {loading ? (tab === 'login' ? 'Logging in…' : 'Creating account…') : (tab === 'login' ? 'Log in' : 'Create account')}
            </button>
          </form>
        </div>

        {/* Guest option */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>
          <button
            type="button"
            onClick={onGuest}
            className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            Continue as guest
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Guest data is stored on this device only — no sync between devices.
          </p>
        </div>
      </div>
    </div>
  )
}
