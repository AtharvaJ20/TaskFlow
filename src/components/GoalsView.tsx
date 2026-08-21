import { useMemo, useState } from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import type { Goal, Task, GoalProgressEntry } from '../types/task'
import { computeExpectedTotal } from '../utils/goalProgress'

interface GoalsViewProps {
  goals: Goal[]
  tasks: Task[]
  entries: GoalProgressEntry[]
  onEditGoal: (goal: Goal) => void
  onNewGoal: () => void
  onTaskClick: (task: Task) => void
  onToggleTask: (id: string) => void
  onLogProgress: (goal: Goal) => void
}

function ProgressRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100 dark:text-gray-800" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

type GoalStatus = 'on-track' | 'at-risk' | 'overdue' | 'complete' | 'no-data'

function StatusBadge({ status }: { status: GoalStatus }) {
  const map: Record<GoalStatus, string> = {
    'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'at-risk':  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'overdue':  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'complete': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'no-data':  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  }
  const label: Record<GoalStatus, string> = {
    'on-track': 'On track',
    'at-risk':  'At risk',
    'overdue':  'Overdue',
    'complete': 'Complete',
    'no-data':  'No data yet',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status]}`}>
      {label[status]}
    </span>
  )
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Edit goal"
      className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
    >
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
        <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function DeadlineLabel({ deadline }: { deadline: string }) {
  const daysLeft = differenceInDays(parseISO(deadline), new Date())
  return (
    <span className={`text-xs ${daysLeft < 0 ? 'text-red-500 dark:text-red-400' : daysLeft <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
      {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
      {' · '}{format(parseISO(deadline), 'MMM d, yyyy')}
    </span>
  )
}

// ─── Task-based card ──────────────────────────────────────────────────────────

function TaskGoalCard({ goal, tasks, onEdit, onTaskClick, onToggleTask }: {
  goal: Goal
  tasks: Task[]
  onEdit: () => void
  onTaskClick: (task: Task) => void
  onToggleTask: (id: string) => void
}) {
  const [showTasks, setShowTasks] = useState(false)

  const linked = useMemo(() => tasks.filter(t => t.goalId === goal.id), [tasks, goal.id])
  const done = linked.filter(t => t.completed).length
  // Expected total based on goal duration × recurrence, not raw task count
  const expectedTotal = useMemo(() => computeExpectedTotal(goal, linked), [goal, linked])
  const total = linked.length
  const pct = expectedTotal > 0 ? Math.min(100, Math.round((done / expectedTotal) * 100)) : 0

  const daysLeft = differenceInDays(parseISO(goal.deadline), new Date())

  const last7done = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return linked.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= cutoff).length
  }, [linked])

  // Divide by days the goal has been active (capped at 7) so a new goal isn't
  // penalised for days that haven't happened yet.
  const goalAgeDays = Math.max(1, Math.min(7, differenceInDays(new Date(), parseISO(goal.createdAt)) + 1))
  const dailyVelocity = last7done / goalAgeDays
  const remaining = expectedTotal - done
  const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : Infinity

  const status: GoalStatus =
    expectedTotal === 0 ? 'no-data'
    : done >= expectedTotal ? 'complete'
    : daysLeft < 0 ? 'overdue'
    : dailyVelocity >= dailyNeeded ? 'on-track'
    : 'at-risk'

  const projectedDays = dailyVelocity > 0 && remaining > 0 ? Math.ceil(remaining / dailyVelocity) : null

  // Deduplicate recurring tasks — show one row per unique pattern, not one per instance
  const { nonRecurring, recurringGroups } = useMemo(() => {
    const map = new Map<string, { representative: Task; completedCount: number; activeTask: Task | null }>()
    const nonRecurring: Task[] = []
    for (const t of linked) {
      if (!t.recurrence) {
        nonRecurring.push(t)
      } else {
        const key = `${t.title}-${t.recurrence.frequency}-${t.recurrence.interval}`
        if (!map.has(key)) {
          map.set(key, { representative: t, completedCount: t.completed ? 1 : 0, activeTask: !t.completed ? t : null })
        } else {
          const g = map.get(key)!
          if (t.completed) g.completedCount++
          else if (!g.activeTask) g.activeTask = t
        }
      }
    }
    return { nonRecurring, recurringGroups: Array.from(map.values()) }
  }, [linked])

  const uniqueCount = nonRecurring.length + recurringGroups.length
  const activeNonRecurring = nonRecurring.filter(t => !t.completed)
  const completedNonRecurring = nonRecurring.filter(t => t.completed)
  const activeRecurring = recurringGroups.filter(g => g.activeTask !== null)
  const completedRecurring = recurringGroups.filter(g => g.activeTask === null && g.completedCount > 0)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: goal.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <ProgressRing pct={pct} color={goal.color} size={64} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-white">{pct}%</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">{goal.title}</h3>
              {goal.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <StatusBadge status={status} />
                <DeadlineLabel deadline={goal.deadline} />
              </div>
            </div>
          </div>
          <EditButton onClick={onEdit} />
        </div>

        <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 dark:border-gray-700 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{done}/{expectedTotal}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Done / expected</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {dailyVelocity > 0 ? dailyVelocity.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tasks/day (7d)</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${
              projectedDays === null ? 'text-gray-400 dark:text-gray-500'
              : projectedDays <= daysLeft ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
            }`}>
              {projectedDays !== null ? format(new Date(Date.now() + projectedDays * 86400000), 'MMM d') : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Projected finish</p>
          </div>
        </div>

        {uniqueCount > 0 && (
          <button
            type="button"
            onClick={() => setShowTasks(v => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-1"
          >
            <span>{uniqueCount} linked task{uniqueCount !== 1 ? 's' : ''}</span>
            <svg viewBox="0 0 16 16" fill="none" className={`w-3.5 h-3.5 transition-transform ${showTasks ? 'rotate-180' : ''}`} aria-hidden="true">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {showTasks && (
          <div className="mt-2 flex flex-col gap-1">
            {/* Active non-recurring tasks */}
            {activeNonRecurring.map(task => (
              <div key={task.id} className="flex items-center gap-2.5 py-1">
                <button type="button" onClick={() => onToggleTask(task.id)} aria-label="Mark complete"
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent-400 transition-colors focus:outline-none" />
                <button type="button" onClick={() => onTaskClick(task)}
                  className="flex-1 text-sm text-gray-700 dark:text-gray-300 text-left truncate hover:text-accent-600 dark:hover:text-accent-400 transition-colors focus:outline-none">
                  {task.title}
                </button>
              </div>
            ))}
            {/* Active recurring patterns — one row per unique pattern */}
            {activeRecurring.map(({ representative, completedCount, activeTask }) => (
              <div key={`${representative.title}-${representative.recurrence?.frequency}`} className="flex items-center gap-2.5 py-1">
                <button type="button" onClick={() => onToggleTask(activeTask!.id)} aria-label="Mark complete"
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent-400 transition-colors focus:outline-none" />
                <button type="button" onClick={() => onTaskClick(activeTask!)}
                  className="flex-1 text-sm text-gray-700 dark:text-gray-300 text-left truncate hover:text-accent-600 dark:hover:text-accent-400 transition-colors focus:outline-none">
                  {representative.title}
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {representative.recurrence?.frequency} · {completedCount} done
                </span>
              </div>
            ))}
            {/* Completed section */}
            {(completedNonRecurring.length > 0 || completedRecurring.length > 0) && (
              <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                {completedNonRecurring.map(task => (
                  <div key={task.id} className="flex items-center gap-2.5 py-1 opacity-50">
                    <button type="button" onClick={() => onToggleTask(task.id)} aria-label="Mark incomplete"
                      className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-indigo-600 flex-shrink-0 flex items-center justify-center focus:outline-none">
                      <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 line-through truncate">{task.title}</span>
                  </div>
                ))}
                {completedRecurring.map(({ representative, completedCount }) => (
                  <div key={`${representative.title}-${representative.recurrence?.frequency}-done`} className="flex items-center gap-2.5 py-1 opacity-50">
                    <div className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-indigo-600 flex-shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 line-through truncate">{representative.title}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {representative.recurrence?.frequency} · {completedCount} done
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {uniqueCount === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            No tasks linked yet — assign tasks to this goal from the task form or task detail.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Metric-based card ────────────────────────────────────────────────────────

function MetricGoalCard({ goal, entries, onEdit, onLogProgress }: {
  goal: Goal
  entries: GoalProgressEntry[]
  onEdit: () => void
  onLogProgress: () => void
}) {
  const [showHistory, setShowHistory] = useState(false)

  const goalEntries = useMemo(() =>
    entries.filter(e => e.goalId === goal.id).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    [entries, goal.id]
  )

  const startValue = goal.startValue ?? 0
  const targetValue = goal.targetValue ?? 100
  const unit = goal.unit ?? ''
  const range = targetValue - startValue

  const latestEntry = goalEntries[goalEntries.length - 1]
  const currentValue = latestEntry?.value ?? startValue

  const pct = range !== 0
    ? Math.max(0, Math.min(100, Math.round(((currentValue - startValue) / range) * 100)))
    : 0

  const daysLeft = differenceInDays(parseISO(goal.deadline), new Date())

  // Velocity: net change over last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
  const entriesInLast7d = goalEntries.filter(e => new Date(e.loggedAt) > sevenDaysAgo)
  const entryBefore7d = [...goalEntries].reverse().find(e => new Date(e.loggedAt) <= sevenDaysAgo)
  const valueAt7dAgo = entryBefore7d?.value ?? startValue
  const weeklyChange = entriesInLast7d.length > 0 ? currentValue - valueAt7dAgo : 0
  const dailyVelocity = weeklyChange / 7

  const remaining = targetValue - currentValue
  const projectedDays = dailyVelocity !== 0 && Math.sign(remaining) === Math.sign(dailyVelocity)
    ? Math.ceil(remaining / dailyVelocity)
    : null

  const isComplete = range > 0 ? currentValue >= targetValue : currentValue <= targetValue

  const status: GoalStatus =
    goalEntries.length === 0 ? 'no-data'
    : isComplete ? 'complete'
    : daysLeft < 0 ? 'overdue'
    : projectedDays !== null && projectedDays <= daysLeft ? 'on-track'
    : 'at-risk'

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: goal.color }} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <ProgressRing pct={pct} color={goal.color} size={64} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-white">{pct}%</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">{goal.title}</h3>
              {goal.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <StatusBadge status={status} />
                <DeadlineLabel deadline={goal.deadline} />
              </div>
            </div>
          </div>
          <EditButton onClick={onEdit} />
        </div>

        {/* Current → target value */}
        <div className="flex items-baseline gap-2 mb-3 px-1">
          <span className="text-2xl font-bold tabular-nums" style={{ color: goal.color }}>
            {currentValue}{unit}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">of {targetValue}{unit}</span>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 dark:border-gray-700 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
              {Math.abs(weeklyChange) > 0
                ? `${weeklyChange > 0 ? '+' : ''}${parseFloat(weeklyChange.toFixed(2))}`
                : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Change (7d)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
              {Math.abs(dailyVelocity) > 0
                ? `${dailyVelocity > 0 ? '+' : ''}${parseFloat(dailyVelocity.toFixed(2))}`
                : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{unit ? `${unit}/day` : 'per day'}</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold tabular-nums ${
              projectedDays === null ? 'text-gray-400 dark:text-gray-500'
              : projectedDays <= daysLeft ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
            }`}>
              {projectedDays !== null
                ? format(new Date(Date.now() + projectedDays * 86400000), 'MMM d')
                : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Projected finish</p>
          </div>
        </div>

        {/* Log button + history toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onLogProgress}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors focus:outline-none"
            style={{ color: goal.color }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Log progress
          </button>

          {goalEntries.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
            >
              History ({goalEntries.length})
              <svg viewBox="0 0 16 16" fill="none" className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {showHistory && goalEntries.length > 0 && (
          <div className="mt-2 flex flex-col max-h-40 overflow-y-auto">
            {[...goalEntries].reverse().map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-1.5 text-sm border-t border-gray-50 dark:border-gray-700/50 first:border-t-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{entry.value}{unit}</span>
                  {entry.note && (
                    <span className="text-gray-400 dark:text-gray-500 text-xs truncate">{entry.note}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                  {format(parseISO(entry.loggedAt), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        )}

        {goalEntries.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            No progress logged yet — tap "Log progress" to record your first update.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function GoalsView({ goals, tasks, entries, onEditGoal, onNewGoal, onTaskClick, onToggleTask, onLogProgress }: GoalsViewProps) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-accent-500" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">No goals yet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">
          Set a goal with a deadline, then track it — via tasks or a numeric metric.
        </p>
        <button type="button" onClick={onNewGoal}
          className="bg-accent-600 hover:bg-accent-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          Create your first goal
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">
          {goals.length} goal{goals.length !== 1 ? 's' : ''}
        </h2>
        <button type="button" onClick={onNewGoal}
          className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New goal
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {goals.map(goal =>
          goal.goalType === 'metric' ? (
            <MetricGoalCard
              key={goal.id}
              goal={goal}
              entries={entries}
              onEdit={() => onEditGoal(goal)}
              onLogProgress={() => onLogProgress(goal)}
            />
          ) : (
            <TaskGoalCard
              key={goal.id}
              goal={goal}
              tasks={tasks}
              onEdit={() => onEditGoal(goal)}
              onTaskClick={onTaskClick}
              onToggleTask={onToggleTask}
            />
          )
        )}
      </div>
    </div>
  )
}
