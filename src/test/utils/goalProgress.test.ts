import { describe, expect, it } from 'vitest'
import { computeExpectedTotal, getGoalPct } from '../../utils/goalProgress'
import type { Goal, GoalProgressEntry, Task } from '../../types/task'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Test Goal',
    deadline: '2025-01-31',
    color: '#000',
    createdAt: '2025-01-01',
    goalType: 'task',
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Read',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: '2025-01-01',
    ...overrides,
  }
}

// goal spans 30 days (Jan 1 → Jan 31)
const GOAL = makeGoal()

describe('computeExpectedTotal', () => {
  it('returns 0 when no tasks are linked', () => {
    expect(computeExpectedTotal(GOAL, [])).toBe(0)
  })

  it('counts each non-recurring task as 1', () => {
    const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2', title: 'Write' })]
    expect(computeExpectedTotal(GOAL, tasks)).toBe(2)
  })

  it('computes expected completions for a daily recurring task', () => {
    // 30-day goal ÷ 1-day interval = 30
    const task = makeTask({ recurrence: { frequency: 'daily', interval: 1 } })
    expect(computeExpectedTotal(GOAL, [task])).toBe(30)
  })

  it('computes expected completions for a weekly recurring task', () => {
    // 30-day goal ÷ 7-day interval ≈ 4 (rounded)
    const task = makeTask({ recurrence: { frequency: 'weekly', interval: 1 } })
    expect(computeExpectedTotal(GOAL, [task])).toBe(4)
  })

  it('computes expected completions for a monthly recurring task', () => {
    // 30-day goal ÷ 30-day interval = 1
    const task = makeTask({ recurrence: { frequency: 'monthly', interval: 1 } })
    expect(computeExpectedTotal(GOAL, [task])).toBe(1)
  })

  it('deduplicates multiple instances of the same recurring series', () => {
    // Three instances of the same daily-1 task → should count as one series (30)
    const base = { title: 'Read', recurrence: { frequency: 'daily' as const, interval: 1 } }
    const tasks = [
      makeTask({ id: 't1', ...base, dueDate: '2025-01-01' }),
      makeTask({ id: 't2', ...base, dueDate: '2025-01-02' }),
      makeTask({ id: 't3', ...base, dueDate: '2025-01-03' }),
    ]
    expect(computeExpectedTotal(GOAL, tasks)).toBe(30)
  })

  it('sums two distinct recurring series', () => {
    // Read daily-1 (→30) + Exercise weekly-1 (→4)
    const tasks = [
      makeTask({ id: 't1', title: 'Read', recurrence: { frequency: 'daily', interval: 1 } }),
      makeTask({ id: 't2', title: 'Exercise', recurrence: { frequency: 'weekly', interval: 1 } }),
    ]
    expect(computeExpectedTotal(GOAL, tasks)).toBe(34)
  })

  it('mixes non-recurring and recurring tasks', () => {
    // 1 non-recurring + 1 daily-1 series (30) = 31
    const tasks = [
      makeTask({ id: 't1' }),
      makeTask({ id: 't2', title: 'Meditate', recurrence: { frequency: 'daily', interval: 1 } }),
    ]
    expect(computeExpectedTotal(GOAL, tasks)).toBe(31)
  })

  it('returns at least 1 for a recurring task with a very long interval', () => {
    // interval=365 on a 30-day goal → Math.round(30/365)=0 → clamped to 1
    const task = makeTask({ recurrence: { frequency: 'daily', interval: 365 } })
    expect(computeExpectedTotal(GOAL, [task])).toBeGreaterThanOrEqual(1)
  })
})

describe('getGoalPct — task goals', () => {
  it('returns 0 when no tasks are linked', () => {
    expect(getGoalPct(GOAL, [], [])).toBe(0)
  })

  it('returns 0 when no tasks are completed', () => {
    const tasks = [makeTask({ goalId: 'g1' })]
    expect(getGoalPct(GOAL, tasks, [])).toBe(0)
  })

  it('returns 50 when half the tasks are completed', () => {
    const tasks = [
      makeTask({ id: 't1', goalId: 'g1', completed: true }),
      makeTask({ id: 't2', goalId: 'g1', completed: false }),
    ]
    // expected = 2 non-recurring, done = 1 → 50%
    expect(getGoalPct(GOAL, tasks, [])).toBe(50)
  })

  it('caps at 100 even when done exceeds expected', () => {
    // A recurring series expected 1 time but completed 5 → should cap at 100
    const goal = makeGoal({ deadline: '2025-01-02' }) // 1-day span
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: `t${i}`, goalId: 'g1', completed: true,
        recurrence: { frequency: 'daily', interval: 1 } })
    )
    expect(getGoalPct(goal, tasks, [])).toBe(100)
  })

  it('ignores tasks not linked to this goal', () => {
    const tasks = [
      makeTask({ id: 't1', goalId: 'g2', completed: true }),
      makeTask({ id: 't2', goalId: 'g1', completed: false }),
    ]
    expect(getGoalPct(GOAL, tasks, [])).toBe(0)
  })
})

describe('getGoalPct — metric goals', () => {
  const metricGoal = makeGoal({ goalType: 'metric', startValue: 0, targetValue: 100 })

  function entry(value: number, loggedAt = '2025-01-15T00:00:00Z'): GoalProgressEntry {
    return { id: 'e1', goalId: 'g1', value, loggedAt }
  }

  it('returns 0 when no progress entries exist', () => {
    expect(getGoalPct(metricGoal, [], [])).toBe(0)
  })

  it('returns 50 when latest value is halfway to target', () => {
    expect(getGoalPct(metricGoal, [], [entry(50)])).toBe(50)
  })

  it('returns 100 when latest value equals target', () => {
    expect(getGoalPct(metricGoal, [], [entry(100)])).toBe(100)
  })

  it('uses the most recent entry when multiple exist', () => {
    const entries = [
      { id: 'e1', goalId: 'g1', value: 20, loggedAt: '2025-01-10T00:00:00Z' },
      { id: 'e2', goalId: 'g1', value: 75, loggedAt: '2025-01-20T00:00:00Z' },
    ]
    expect(getGoalPct(metricGoal, [], entries)).toBe(75)
  })

  it('clamps to 0 when latest value is below startValue', () => {
    const g = makeGoal({ goalType: 'metric', startValue: 50, targetValue: 100 })
    expect(getGoalPct(g, [], [entry(30)])).toBe(0)
  })

  it('returns 0 when start equals target (zero range)', () => {
    const g = makeGoal({ goalType: 'metric', startValue: 50, targetValue: 50 })
    expect(getGoalPct(g, [], [entry(50)])).toBe(0)
  })

  it('ignores entries from other goals', () => {
    const foreign: GoalProgressEntry = { id: 'e1', goalId: 'g2', value: 80, loggedAt: '2025-01-10T00:00:00Z' }
    expect(getGoalPct(metricGoal, [], [foreign])).toBe(0)
  })
})
