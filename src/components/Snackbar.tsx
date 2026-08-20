import { useEffect } from 'react'

interface SnackbarProps {
  message: string
  actionLabel: string
  onAction: () => void
  onDismiss: () => void
  duration?: number
}

export default function Snackbar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 5000,
}: SnackbarProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [onDismiss, duration])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 dark:bg-gray-700 text-white px-4 py-3 rounded-xl shadow-xl text-sm whitespace-nowrap motion-safe:animate-snack-up"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onAction}
        className="font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
      >
        {actionLabel}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 text-gray-400 hover:text-white transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
