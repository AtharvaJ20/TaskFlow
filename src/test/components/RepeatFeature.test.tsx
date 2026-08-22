/**
 * QA — Repeat scheduling feature
 *
 * Coverage:
 *  1. nextCustomDay() — pure function edge cases (exported for testing via module internals)
 *  2. TaskInput repeat UI — chip label, panel expand/collapse, frequency selection, custom day
 *     toggles, form submission with each frequency type
 *  3. useTasks.addTask — recurrence field stored on the created task
 *  4. useTasks.toggleTask — next occurrence spawned correctly for all frequencies including custom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, format } from 'date-fns'
import TaskInput from '../../components/TaskInput'
import { useTasks } from '../../hooks/useTasks'
import type { NewTaskInput, TaskList } from '../../types/task'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      then: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

// ─── helpers ──────────────────────────────────────────────────────────────────

const NO_LISTS: TaskList[] = []
const A_DATE = '2026-08-24' // a Monday (getDay()===1)

function renderInput(onAdd: (i: NewTaskInput) => void = vi.fn()) {
  render(<TaskInput onAdd={onAdd} lists={NO_LISTS} goals={[]} activeListId={null} />)
}

async function openRepeatPanel() {
  await userEvent.click(screen.getByRole('button', { name: /set repeat schedule/i }))
}

// ─── 1. nextCustomDay — extracted logic tested via toggleTask behaviour ────

// The function is not exported, so we test it through the hook's toggleTask.
// We set up tasks with dueDate on known weekdays and verify the next occurrence.

describe('nextCustomDay logic via toggleTask', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  function setupHook() {
    return renderHook(() => useTasks(null))
  }

  it('daily: advances by 1 day', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Daily task',
        dueDate: A_DATE,
        recurrence: { frequency: 'daily', interval: 1 },
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const tasks = result.current.tasks
    const next = tasks.find(t => !t.completed && t.recurrence?.frequency === 'daily')
    expect(next).toBeDefined()
    const expectedDate = format(addDays(new Date(A_DATE + 'T00:00:00'), 1), 'yyyy-MM-dd')
    expect(next!.dueDate).toBe(expectedDate)
  })

  it('weekly: advances by 7 days', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Weekly task',
        dueDate: A_DATE,
        recurrence: { frequency: 'weekly', interval: 1 },
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed && t.recurrence?.frequency === 'weekly')
    expect(next).toBeDefined()
    const expectedDate = format(addDays(new Date(A_DATE + 'T00:00:00'), 7), 'yyyy-MM-dd')
    expect(next!.dueDate).toBe(expectedDate)
  })

  it('monthly: advances by 1 month', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Monthly task',
        dueDate: A_DATE,
        recurrence: { frequency: 'monthly', interval: 1 },
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed && t.recurrence?.frequency === 'monthly')
    expect(next).toBeDefined()
    // 2026-08-24 + 1 month = 2026-09-24
    expect(next!.dueDate).toBe('2026-09-24')
  })

  it('custom — next selected day in same week (Mon→Wed)', () => {
    // A_DATE is Monday (day 1). Next selected day is Wednesday (day 3) → +2 days.
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Custom task',
        dueDate: A_DATE, // Monday
        recurrence: { frequency: 'custom', interval: 1, customDays: [3, 5] }, // Wed, Fri
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed && t.recurrence?.frequency === 'custom')
    expect(next).toBeDefined()
    // Monday + 2 = Wednesday 2026-08-26
    expect(next!.dueDate).toBe('2026-08-26')
  })

  it('custom — wraps to next week when no later day this week (Fri→Mon)', () => {
    // Use a Friday. customDays = [1] (Monday only). Should wrap: 7 - 5 + 1 = 3 days → next Mon.
    const FRIDAY = '2026-08-21' // getDay() === 5
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Custom wrap',
        dueDate: FRIDAY,
        recurrence: { frequency: 'custom', interval: 1, customDays: [1] }, // Monday
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed && t.recurrence?.frequency === 'custom')
    expect(next).toBeDefined()
    // Friday (5) → next Monday: 7 - 5 + 1 = 3 days → 2026-08-24
    expect(next!.dueDate).toBe('2026-08-24')
  })

  it('custom — Saturday to next Sunday wraps correctly', () => {
    const SATURDAY = '2026-08-22' // getDay() === 6
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Custom Sat→Sun',
        dueDate: SATURDAY,
        recurrence: { frequency: 'custom', interval: 1, customDays: [0] }, // Sunday only
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed && t.recurrence?.frequency === 'custom')
    expect(next).toBeDefined()
    // Sat (6) → next Sun: 7 - 6 + 0 = 1 day → 2026-08-23
    expect(next!.dueDate).toBe('2026-08-23')
  })

  it('custom — empty customDays falls back to +1 day', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Custom no days',
        dueDate: A_DATE,
        recurrence: { frequency: 'custom', interval: 1, customDays: [] },
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed && t.recurrence?.frequency === 'custom')
    expect(next).toBeDefined()
    expect(next!.dueDate).toBe('2026-08-25') // +1 day
  })

  it('custom — undefined customDays (missing field) falls back to +1 day', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Custom undefined days',
        dueDate: A_DATE,
        recurrence: { frequency: 'custom', interval: 1 }, // no customDays field
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed && t.recurrence?.frequency === 'custom')
    expect(next).toBeDefined()
    expect(next!.dueDate).toBe('2026-08-25')
  })

  it('task without recurrence just toggles completed', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({ title: 'One-off', dueDate: A_DATE })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const task = result.current.tasks.find(t => t.id === taskId)
    expect(task?.completed).toBe(true)
    // No new task spawned
    expect(result.current.tasks.filter(t => t.title === 'One-off')).toHaveLength(1)
  })

  it('task with recurrence but no dueDate just toggles completed (no spawn)', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Recurring no date',
        recurrence: { frequency: 'daily', interval: 1 },
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const task = result.current.tasks.find(t => t.id === taskId)
    expect(task?.completed).toBe(true)
    expect(result.current.tasks.filter(t => t.title === 'Recurring no date')).toHaveLength(1)
  })

  it('spawned task retains same recurrence and title', () => {
    const { result } = setupHook()
    let taskId: string
    act(() => {
      const t = result.current.addTask({
        title: 'Persist recurrence',
        dueDate: A_DATE,
        recurrence: { frequency: 'custom', interval: 1, customDays: [2, 4] },
      })
      taskId = t.id
    })
    act(() => { result.current.toggleTask(taskId!) })

    const next = result.current.tasks.find(t => !t.completed)
    expect(next?.title).toBe('Persist recurrence')
    expect(next?.recurrence?.frequency).toBe('custom')
    expect(next?.recurrence?.customDays).toEqual([2, 4])
  })
})

// ─── 2. useTasks.addTask — recurrence stored on task ─────────────────────────

describe('useTasks.addTask stores recurrence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('stores daily recurrence', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask({
        title: 'Daily',
        recurrence: { frequency: 'daily', interval: 1 },
      })
    })
    expect(result.current.tasks[0].recurrence).toEqual({ frequency: 'daily', interval: 1 })
  })

  it('stores custom recurrence with days', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask({
        title: 'Custom',
        recurrence: { frequency: 'custom', interval: 1, customDays: [1, 3, 5] },
      })
    })
    expect(result.current.tasks[0].recurrence).toEqual({
      frequency: 'custom',
      interval: 1,
      customDays: [1, 3, 5],
    })
  })

  it('stores no recurrence when omitted', () => {
    const { result } = renderHook(() => useTasks(null))
    act(() => {
      result.current.addTask({ title: 'One-off' })
    })
    expect(result.current.tasks[0].recurrence).toBeUndefined()
  })
})

// ─── 3. TaskInput repeat chip label ──────────────────────────────────────────

describe('TaskInput — repeat chip label', () => {
  it('shows "No repeat" by default', () => {
    renderInput()
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveTextContent('No repeat')
  })

  it('shows "Daily" after selecting Daily', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^daily$/i }))
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveTextContent('Daily')
  })

  it('shows "Weekly" after selecting Weekly', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^weekly$/i }))
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveTextContent('Weekly')
  })

  it('shows "Monthly" after selecting Monthly', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^monthly$/i }))
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveTextContent('Monthly')
  })

  it('shows "Custom" when Custom is selected and no days chosen', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveTextContent('Custom')
  })

  it('shows abbreviated days when Custom + days chosen', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^monday$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^wednesday$/i }))
    const chip = screen.getByRole('button', { name: /set repeat schedule/i })
    expect(chip).toHaveTextContent('Mo, We')
  })

  it('sorts day abbreviations correctly (Sa selected before Mo)', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^saturday$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^monday$/i }))
    const chip = screen.getByRole('button', { name: /set repeat schedule/i })
    // Sorted by day number: Mo (1) before Sa (6)
    expect(chip).toHaveTextContent('Mo, Sa')
  })
})

// ─── 4. TaskInput repeat panel expand / collapse ──────────────────────────────

describe('TaskInput — repeat panel expand/collapse', () => {
  it('panel is hidden by default', () => {
    renderInput()
    expect(screen.queryByRole('button', { name: /^daily$/i })).not.toBeInTheDocument()
  })

  it('panel opens when chip is clicked', async () => {
    renderInput()
    await openRepeatPanel()
    expect(screen.getByRole('button', { name: /^daily$/i })).toBeInTheDocument()
  })

  it('chip has aria-expanded=false when closed', () => {
    renderInput()
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveAttribute('aria-expanded', 'false')
  })

  it('chip has aria-expanded=true when open', async () => {
    renderInput()
    await openRepeatPanel()
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('panel closes on second chip click', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /set repeat schedule/i }))
    expect(screen.queryByRole('button', { name: /^daily$/i })).not.toBeInTheDocument()
  })

  it('day picker only appears when Custom is selected', async () => {
    renderInput()
    await openRepeatPanel()
    expect(screen.queryByRole('button', { name: /^monday$/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    expect(screen.getByRole('button', { name: /^monday$/i })).toBeInTheDocument()
  })

  it('day picker disappears when switching away from Custom', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^daily$/i }))
    expect(screen.queryByRole('button', { name: /^monday$/i })).not.toBeInTheDocument()
  })
})

// ─── 5. TaskInput custom day toggles ─────────────────────────────────────────

describe('TaskInput — custom day toggles', () => {
  it('day button toggles aria-pressed', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    const tuBtn = screen.getByRole('button', { name: /^tuesday$/i })
    expect(tuBtn).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(tuBtn)
    expect(tuBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('day can be toggled off', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    const fri = screen.getByRole('button', { name: /^friday$/i })
    await userEvent.click(fri)
    await userEvent.click(fri)
    expect(fri).toHaveAttribute('aria-pressed', 'false')
  })

  it('switching away from Custom clears selected days', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^monday$/i }))
    // Switch to Daily then back to Custom
    await userEvent.click(screen.getByRole('button', { name: /^daily$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    // No days should be pre-selected
    expect(screen.getByRole('button', { name: /^monday$/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('all 7 day buttons are rendered', async () => {
    renderInput()
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (const d of days) {
      expect(screen.getByRole('button', { name: new RegExp(`^${d}$`, 'i') })).toBeInTheDocument()
    }
  })
})

// ─── 6. TaskInput handleSubmit — recurrence in NewTaskInput ──────────────────

describe('TaskInput — handleSubmit passes recurrence', () => {
  it('submits without recurrence when "No repeat" selected', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    fireEvent.change(screen.getByRole('textbox', { name: /new task title/i }), {
      target: { value: 'My task' },
    })
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(onAdd).toHaveBeenCalledOnce()
    const input: NewTaskInput = onAdd.mock.calls[0][0]
    expect(input.recurrence).toBeUndefined()
  })

  it('submits daily recurrence', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    fireEvent.change(screen.getByRole('textbox', { name: /new task title/i }), {
      target: { value: 'Daily task' },
    })
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^daily$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    const input: NewTaskInput = onAdd.mock.calls[0][0]
    expect(input.recurrence).toEqual({ frequency: 'daily', interval: 1 })
  })

  it('submits weekly recurrence', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    fireEvent.change(screen.getByRole('textbox', { name: /new task title/i }), {
      target: { value: 'Weekly task' },
    })
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^weekly$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    const input: NewTaskInput = onAdd.mock.calls[0][0]
    expect(input.recurrence).toEqual({ frequency: 'weekly', interval: 1 })
  })

  it('submits monthly recurrence', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    fireEvent.change(screen.getByRole('textbox', { name: /new task title/i }), {
      target: { value: 'Monthly task' },
    })
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^monthly$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    const input: NewTaskInput = onAdd.mock.calls[0][0]
    expect(input.recurrence).toEqual({ frequency: 'monthly', interval: 1 })
  })

  it('submits custom recurrence with sorted days', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    fireEvent.change(screen.getByRole('textbox', { name: /new task title/i }), {
      target: { value: 'Custom task' },
    })
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    // Click Friday (5) then Wednesday (3) — should be sorted to [3, 5] in output
    await userEvent.click(screen.getByRole('button', { name: /^friday$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^wednesday$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    const input: NewTaskInput = onAdd.mock.calls[0][0]
    expect(input.recurrence).toEqual({ frequency: 'custom', interval: 1, customDays: [3, 5] })
  })

  it('submits custom with no days (no customDays key)', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    fireEvent.change(screen.getByRole('textbox', { name: /new task title/i }), {
      target: { value: 'Custom task no days' },
    })
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    const input: NewTaskInput = onAdd.mock.calls[0][0]
    expect(input.recurrence).toEqual({ frequency: 'custom', interval: 1 })
    expect(input.recurrence?.customDays).toBeUndefined()
  })

  it('resets repeat state after submit', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    fireEvent.change(screen.getByRole('textbox', { name: /new task title/i }), {
      target: { value: 'Reset test' },
    })
    await openRepeatPanel()
    await userEvent.click(screen.getByRole('button', { name: /^weekly$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    // After submit chip label should be back to "No repeat"
    expect(screen.getByRole('button', { name: /set repeat schedule/i })).toHaveTextContent('No repeat')
    // Panel should be closed
    expect(screen.queryByRole('button', { name: /^daily$/i })).not.toBeInTheDocument()
  })

  it('does not submit empty title', async () => {
    const onAdd = vi.fn()
    renderInput(onAdd)
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(onAdd).not.toHaveBeenCalled()
  })
})
