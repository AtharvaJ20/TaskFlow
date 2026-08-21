import { useMemo, useState } from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import type { Goal, Task } from '../types/task'

interface GoalsViewProps {
  goals: Goal[]
  tasks: Task[]
  onEditGoal: (goal: Goal) => void
  onNewGoal: () => void
  onTaskClick: (task: Task) => void
  onToggleTask: (id: string) => void
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

function StatusBadge({ status }: { status: 'on-track' | 'at-risk' | 'overdue' | 'complete' | 'no-tasks' }) {
  const map = {
    'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'at-risk':  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'overdue':  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'complete': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'no-tasks': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  }
  const label = {
    'on-track': 'On track',
    'at-risk':  'At risk',
    'overdue':  'Overdue',
    'complete': 'Complete',
    'no-tasks': 'No tasks yet',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status]}`}>
      {label[status]}
    </span>
  )
}

function GoalCard({ goal, tasks, onEdit, onTaskClick, onToggleTask }: {
  goal: Goal
  tasks: Task[]
  onEdit: () => void
  onTaskClick: (task: Task) => void
  onToggleTask: (id: string) => void
}) {
  const [showTasks, setShowTasks] = useState(false)

  const linked = useMemo(() => tasks.filter(t => t.goalId === goal.id), [tasks, goal.id])
  const done = linked.filter(t => t.completed).length
  const total = linked.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const daysLeft = differenceInDays(parseISO(goal.deadline), new Date())

  const last7done = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return linked.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= cutoff).length
  }, [linked])

  const dailyVelocity = last7done / 7
  const remaining = total - done
  const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : Infinity

  const status: 'on-track' | 'at-risk' | 'overdue' | 'complete' | 'no-tasks' =
    total === 0 ? 'no-tasks'
    : done === total ? 'complete'
    : daysLeft < 0 ? 'overdue'
    : dailyVelocity >= dailyNeeded ? 'on-track'
    : 'at-risk'

  const projectedDays = dailyVelocity > 0 && remaining > 0
    ? Math.ceil(remaining / dailyVelocity)
    : null

  const activeTasks = linked.filter(t => !t.completed)
  const completedTasks = linked.filter(t => t.completed)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      {/* Colored top stripe */}
      <div className="h-1.5 w-full" style={{ backgroundColor: goal.color }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-4">
            {/* Progress ring */}
            <div className="relative flex-shrink-0">
              <ProgressRing pct={pct} color={goal.color} size={64} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-white">
                {pct}%
              </span>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">{goal.title}</h3>
              {goal.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <StatusBadge status={status} />
                <span className={`text-xs ${daysLeft < 0 ? 'text-red-500 dark:text-red-400' : daysLeft <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {daysLeft < 0
                    ? `${Math.abs(daysLeft)}d overdue`
                    : daysLeft === 0 ? 'Due today'
                    : `${daysLeft}d left`}
                  {' · '}{format(parseISO(goal.deadline), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit goal"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 dark:border-gray-700 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{done}/{total}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tasks done</p>
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
              {projectedDays !== null
                ? format(new Date(Date.now() + projectedDays * 86400000), 'MMM d')
                : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Projected finish</p>
          </div>
        </div>

        {/* Task list toggle */}
        {total > 0 && (
          <button
            type="button"
            onClick={() => setShowTasks(v => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-1"
          >
            <span>{total} linked task{total !== 1 ? 's' : ''}</span>
            <svg viewBox="0 0 16 16" fill="none" className={`w-3.5 h-3.5 transition-transform ${showTasks ? 'rotate-180' : ''}`} aria-hidden="true">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {showTasks && (
          <div className="mt-2 flex flex-col gap-1">
            {activeTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2.5 py-1">
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  aria-label="Mark complete"
                  className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 hover:border-accent-400 transition-colors focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onTaskClick(task)}
                  className="flex-1 text-sm text-gray-700 dark:text-gray-300 text-left truncate hover:text-accent-600 dark:hover:text-accent-400 transition-colors focus:outline-none"
                >
                  {task.title}
                </button>
              </div>
            ))}
            {completedTasks.length > 0 && (
              <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                {completedTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2.5 py-1 opacity-50">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      aria-label="Mark incomplete"
                      className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-indigo-600 flex-shrink-0 flex items-center justify-center focus:outline-none"
                    >
                      <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 line-through truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {total === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            No tasks linked yet — assign tasks to this goal from the task form or task detail.
          </p>
        )}
      </div>
    </div>
  )
}

export default function GoalsView({ goals, tasks, onEditGoal, onNewGoal, onTaskClick, onToggleTask }: GoalsViewProps) {
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
          Set a goal with a deadline, then link your tasks to it — and see exactly how you're tracking.
        </p>
        <button
          type="button"
          onClick={onNewGoal}
          className="bg-accent-600 hover:bg-accent-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
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
        <button
          type="button"
          onClick={onNewGoal}
          className="flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New goal
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {goals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            tasks={tasks}
            onEdit={() => onEditGoal(goal)}
            onTaskClick={onTaskClick}
            onToggleTask={onToggleTask}
          />
        ))}
      </div>
    </div>
  )
}
