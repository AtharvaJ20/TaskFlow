import { useEffect, useRef, useState } from 'react'
import type { Goal } from '../types/task'
import { GOAL_COLORS } from '../hooks/useGoals'

interface GoalModalProps {
  goal?: Goal | null
  onSave: (data: Omit<Goal, 'id' | 'createdAt'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function GoalModal({ goal, onSave, onDelete, onClose }: GoalModalProps) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [color, setColor] = useState(goal?.color ?? GOAL_COLORS[0])
  const [goalType, setGoalType] = useState<'task' | 'metric'>(goal?.goalType ?? 'task')
  const [startValue, setStartValue] = useState(goal?.startValue?.toString() ?? '')
  const [targetValue, setTargetValue] = useState(goal?.targetValue?.toString() ?? '')
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const titleRef = useRef<HTMLInputElement>(null)
  const isEdit = !!goal

  useEffect(() => { titleRef.current?.focus() }, [])

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

  const metricValid = goalType !== 'metric' || (startValue !== '' && targetValue !== '' && startValue !== targetValue)

  function handleSave() {
    if (!title.trim() || !deadline || !metricValid) return
    const base = { title: title.trim(), description: description.trim() || undefined, deadline, color, goalType }
    if (goalType === 'metric') {
      onSave({ ...base, startValue: parseFloat(startValue), targetValue: parseFloat(targetValue), unit: unit.trim() || undefined })
    } else {
      onSave({ ...base, startValue: undefined, targetValue: undefined, unit: undefined })
    }
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
        aria-labelledby="goal-modal-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 id="goal-modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {goal ? 'Edit goal' : 'New goal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Goal type — locked in edit mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Goal type
            </label>
            <div className={`grid grid-cols-2 gap-2 ${isEdit ? 'opacity-60 pointer-events-none' : ''}`}>
              {(['task', 'metric'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setGoalType(type)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-lg border-2 text-left transition-colors focus:outline-none ${
                    goalType === type
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className={`text-sm font-medium ${goalType === type ? 'text-accent-700 dark:text-accent-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {type === 'task' ? 'Task-based' : 'Metric-based'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {type === 'task' ? 'Track via linked tasks' : 'Track a numeric value'}
                  </span>
                </button>
              ))}
            </div>
            {isEdit && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Goal type cannot be changed after creation.</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Goal title <span className="text-red-400">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder={goalType === 'metric' ? 'e.g. Reach 55 kg, Save ₹80,000…' : 'e.g. Launch MVP, Learn Spanish…'}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-500 transition"
            />
          </div>

          {/* Metric fields */}
          {goalType === 'metric' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Start value <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={startValue}
                    onChange={e => setStartValue(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Target value <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    placeholder="e.g. 55"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Unit <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="e.g. kg, ₹, books, km…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-accent-500 transition"
                />
              </div>
              {startValue !== '' && targetValue !== '' && startValue === targetValue && (
                <p className="text-xs text-red-500">Start and target values must be different.</p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does success look like?"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none outline-none focus:ring-2 focus:ring-accent-500 transition"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Deadline <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-accent-500 transition"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform focus:outline-none ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500' : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            {goal && onDelete && (
              <button
                type="button"
                onClick={() => { onDelete(goal.id); onClose() }}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium transition-colors"
              >
                Delete goal
              </button>
            )}
          </div>
          <div className="flex gap-2">
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
              disabled={!title.trim() || !deadline || !metricValid}
              className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {goal ? 'Save' : 'Create goal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
