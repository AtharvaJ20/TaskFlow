import { useMemo } from 'react'
import { parseISO, isToday, subDays, isSameDay } from 'date-fns'
import type { Task } from '../types/task'

interface StatsModalProps {
  tasks: Task[]
  onClose: () => void
}

function formatTimeLogged(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function StatsModal({ tasks, onClose }: StatsModalProps) {
  const stats = useMemo(() => {
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const countable = tasks.filter(t =>
      !(t.recurrence && t.dueDate && new Date(t.dueDate) > todayEnd)
    )
    const total = countable.length
    const completed = countable.filter(t => t.completed).length
    const active = total - completed
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0

    // Completion streak — consecutive days with at least 1 completion
    let streak = 0
    for (let i = 0; i < 30; i++) {
      const day = subDays(new Date(), i)
      const completedOnDay = tasks.some(
        t => t.completedAt && isSameDay(parseISO(t.completedAt), day)
      )
      if (completedOnDay) streak++
      else if (i > 0) break
    }

    // Priority breakdown
    const byPriority = { high: 0, medium: 0, low: 0 }
    countable.filter(t => !t.completed).forEach(t => { byPriority[t.priority]++ })

    // Due today
    const dueToday = countable.filter(t => t.dueDate && !t.completed && isToday(parseISO(t.dueDate))).length

    // Overdue
    const overdue = countable.filter(t => {
      if (!t.dueDate || t.completed) return false
      return parseISO(t.dueDate) < new Date() && !isToday(parseISO(t.dueDate))
    }).length

    // Subtask completion
    const subtaskTotal = countable.flatMap(t => t.subtasks ?? []).length
    const subtaskDone = countable.flatMap(t => t.subtasks ?? []).filter(s => s.completed).length

    // Time tracking
    const totalTimeSecs = tasks.reduce((acc, t) => acc + (t.timeLogged ?? 0), 0)
    const topFocused = [...tasks]
      .filter(t => (t.timeLogged ?? 0) > 0)
      .sort((a, b) => (b.timeLogged ?? 0) - (a.timeLogged ?? 0))
      .slice(0, 5)

    return { total, completed, active, pct, streak, byPriority, dueToday, overdue, subtaskTotal, subtaskDone, totalTimeSecs, topFocused }
  }, [tasks])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Statistics">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Statistics</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close statistics"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Overall progress */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Overall</p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total" value={stats.total} />
              <StatCard label="Done" value={stats.completed} sub={`${stats.pct}%`} />
              <StatCard label="Active" value={stats.active} />
            </div>
            {stats.total > 0 && (
              <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full motion-safe:transition-all motion-safe:duration-700"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            )}
          </div>

          {/* Due dates */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Due Dates</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Due Today" value={stats.dueToday} />
              <StatCard label="Overdue" value={stats.overdue} sub={stats.overdue > 0 ? 'needs attention' : 'all clear'} />
            </div>
          </div>

          {/* Priority breakdown */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Active by Priority</p>
            <div className="flex flex-col gap-2">
              {(['high', 'medium', 'low'] as const).map(p => {
                const count = stats.byPriority[p]
                const maxCount = Math.max(...Object.values(stats.byPriority), 1)
                const barPct = Math.round((count / maxCount) * 100)
                const colors = {
                  high: 'bg-red-500',
                  medium: 'bg-amber-400',
                  low: 'bg-green-500',
                }
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 capitalize">{p}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[p]} rounded-full motion-safe:transition-all motion-safe:duration-500`} style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-4 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subtasks + streak */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Subtasks"
              value={stats.subtaskTotal > 0 ? `${stats.subtaskDone}/${stats.subtaskTotal}` : '—'}
              sub={stats.subtaskTotal > 0 ? `${Math.round((stats.subtaskDone / stats.subtaskTotal) * 100)}% done` : undefined}
            />
            <StatCard
              label="Streak"
              value={`${stats.streak}d`}
              sub="days with completions"
            />
          </div>

          {/* Time tracking */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Focus Time</p>
            <StatCard
              label="Total Focused"
              value={stats.totalTimeSecs > 0 ? formatTimeLogged(stats.totalTimeSecs) : '—'}
              sub={stats.totalTimeSecs > 0 ? 'across all tasks' : 'start a Focus session to track time'}
            />
            {stats.topFocused.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">Most focused tasks</p>
                {stats.topFocused.map((t, i) => {
                  const maxSecs = stats.topFocused[0].timeLogged ?? 1
                  const barPct = Math.round(((t.timeLogged ?? 0) / maxSecs) * 100)
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.title}</p>
                        <div className="mt-0.5 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-500 rounded-full motion-safe:transition-all motion-safe:duration-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-accent-600 dark:text-accent-400 flex-shrink-0">
                        {formatTimeLogged(t.timeLogged ?? 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
