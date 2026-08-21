import { differenceInDays, parseISO } from 'date-fns'
import type { Goal, Task, GoalProgressEntry, Recurrence } from '../types/task'

/**
 * For a task-based goal, computes expected total completions over the goal period.
 *
 * - Non-recurring tasks: each counts as 1
 * - Recurring tasks: expected = goalSpanDays / recurrenceIntervalDays
 *   (deduplicated by title+frequency+interval so multiple instances of the
 *    same recurring task don't inflate the denominator)
 */
export function computeExpectedTotal(goal: Goal, linkedTasks: Task[]): number {
  if (linkedTasks.length === 0) return 0
  const goalSpanDays = Math.max(
    1,
    differenceInDays(parseISO(goal.deadline), parseISO(goal.createdAt)),
  )

  const uniqueRecurring = new Map<string, Recurrence>()
  let nonRecurringCount = 0

  for (const t of linkedTasks) {
    if (!t.recurrence) {
      nonRecurringCount++
    } else {
      const key = `${t.title}-${t.recurrence.frequency}-${t.recurrence.interval}`
      if (!uniqueRecurring.has(key)) uniqueRecurring.set(key, t.recurrence)
    }
  }

  const expectedFromRecurring = Array.from(uniqueRecurring.values()).reduce(
    (sum, rec) => {
      const daysPerInterval =
        rec.frequency === 'daily' ? rec.interval
        : rec.frequency === 'weekly' ? rec.interval * 7
        : rec.frequency === 'monthly' ? rec.interval * 30
        : rec.interval
      return sum + Math.max(1, Math.round(goalSpanDays / daysPerInterval))
    },
    0,
  )

  return nonRecurringCount + expectedFromRecurring
}

export function getGoalPct(
  goal: Goal,
  tasks: Task[],
  entries: GoalProgressEntry[],
): number {
  if (goal.goalType === 'metric') {
    const goalEntries = entries.filter(e => e.goalId === goal.id)
    if (goalEntries.length === 0) return 0
    const latest = goalEntries.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b))
    const start = goal.startValue ?? 0
    const target = goal.targetValue ?? 100
    const range = target - start
    if (range === 0) return 0
    return Math.max(0, Math.min(100, Math.round(((latest.value - start) / range) * 100)))
  }

  const linked = tasks.filter(t => t.goalId === goal.id)
  const done = linked.filter(t => t.completed).length
  const expected = computeExpectedTotal(goal, linked)
  return expected > 0 ? Math.min(100, Math.round((done / expected) * 100)) : 0
}
