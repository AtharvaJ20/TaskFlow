import { useEffect, useRef, useState } from 'react'
import type { Goal } from '../types/task'

interface LogProgressModalProps {
  goal: Goal
  currentValue: number
  onSave: (value: number, note?: string) => void
  onClose: () => void
}

export default function LogProgressModal({ goal, currentValue, onSave, onClose }: LogProgressModalProps) {
  const [value, setValue] = useState(currentValue.toString())
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const unit = goal.unit ?? ''
  const start = goal.startValue ?? 0
  const target = goal.targetValue ?? 100
  const range = target - start

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const numVal = parseFloat(value)
  const isValid = value !== '' && !isNaN(numVal)

  const previewPct = isValid && range !== 0
    ? Math.max(0, Math.min(100, Math.round(((numVal - start) / range) * 100)))
    : null

  function handleSave() {
    if (!isValid) return
    onSave(numVal, note.trim() || undefined)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-progress-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Colored stripe */}
        <div className="h-1.5 w-full rounded-t-2xl" style={{ backgroundColor: goal.color }} />

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
              Log progress
            </p>
            <h2 id="log-progress-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {goal.title}
            </h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              Current: <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">{currentValue}{unit}</span>
              {' · '}Target: <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">{target}{unit}</span>
            </p>
          </div>

          {/* Value input */}
          <div>
            <label htmlFor="progress-value" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Current value <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                id="progress-value"
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-accent-500 transition tabular-nums"
              />
              {unit && (
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">{unit}</span>
              )}
            </div>

            {/* Live progress preview */}
            {previewPct !== null && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                  <span>Progress after logging</span>
                  <span className="font-medium tabular-nums">{previewPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${previewPct}%`, backgroundColor: goal.color }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="progress-note" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="progress-note"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="e.g. Good week, stayed consistent"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-500 transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Log progress
          </button>
        </div>
      </div>
    </div>
  )
}
