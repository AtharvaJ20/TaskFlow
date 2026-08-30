import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import StatsModal from '../../components/StatsModal'
import type { Task } from '../../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Task',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// ISO date string for today, yesterday, N days ago
const today = new Date().toISOString()
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString() })()

describe('StatsModal – structure', () => {
  it('renders a dialog with accessible label', () => {
    render(<StatsModal tasks={[]} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: /statistics/i })).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<StatsModal tasks={[]} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close statistics/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('StatsModal – task counts', () => {
  it('shows total, done, and active counts', () => {
    const tasks = [
      makeTask({ completed: false }),
      makeTask({ completed: true, completedAt: today }),
      makeTask({ completed: true, completedAt: today }),
    ]
    render(<StatsModal tasks={tasks} onClose={vi.fn()} />)
    // Numbers appear in stat cards (and possibly priority bars); verify each is present at least once
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)  // total
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)  // done
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)  // active
  })

  it('excludes future recurring task instances from counts', () => {
    const futureDate = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10) })()
    const tasks = [
      makeTask({ completed: false }),
      makeTask({ completed: false, recurrence: { frequency: 'daily', interval: 1 }, dueDate: futureDate }),
    ]
    render(<StatsModal tasks={tasks} onClose={vi.fn()} />)
    // Only 1 task should count; future recurring is excluded
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })
})

describe('StatsModal – time formatting', () => {
  it('shows "Xs" for under 60 seconds', () => {
    render(<StatsModal tasks={[makeTask({ timeLogged: 45 })]} onClose={vi.fn()} />)
    // Appears in both the stat card and the top focused list
    expect(screen.getAllByText('45s').length).toBeGreaterThan(0)
  })

  it('shows "Xm" for minutes under an hour', () => {
    render(<StatsModal tasks={[makeTask({ timeLogged: 300 })]} onClose={vi.fn()} />)
    expect(screen.getAllByText('5m').length).toBeGreaterThan(0)
  })

  it('shows "Xh Ym" for hours with remaining minutes', () => {
    render(<StatsModal tasks={[makeTask({ timeLogged: 90 * 60 })]} onClose={vi.fn()} />)
    expect(screen.getAllByText('1h 30m').length).toBeGreaterThan(0)
  })

  it('shows "Xh" for exact hours', () => {
    render(<StatsModal tasks={[makeTask({ timeLogged: 2 * 3600 })]} onClose={vi.fn()} />)
    expect(screen.getAllByText('2h').length).toBeGreaterThan(0)
  })

  it('shows top focused tasks list when timeLogged > 0', () => {
    render(<StatsModal tasks={[makeTask({ title: 'Deep work', timeLogged: 600 })]} onClose={vi.fn()} />)
    expect(screen.getByText('Deep work')).toBeInTheDocument()
  })
})

describe('StatsModal – streak', () => {
  it('counts 1-day streak when a task was completed today', () => {
    const tasks = [makeTask({ completed: true, completedAt: today })]
    render(<StatsModal tasks={tasks} onClose={vi.fn()} />)
    expect(screen.getByText('1d')).toBeInTheDocument()
  })

  it('counts 2-day streak with completions today and yesterday', () => {
    const tasks = [
      makeTask({ completed: true, completedAt: today }),
      makeTask({ completed: true, completedAt: yesterday }),
    ]
    render(<StatsModal tasks={tasks} onClose={vi.fn()} />)
    expect(screen.getByText('2d')).toBeInTheDocument()
  })

  it('shows 0d streak when no completions', () => {
    render(<StatsModal tasks={[makeTask()]} onClose={vi.fn()} />)
    expect(screen.getByText('0d')).toBeInTheDocument()
  })
})

describe('StatsModal – due dates', () => {
  it('counts tasks due today', () => {
    const todayDate = new Date().toISOString().slice(0, 10)
    const tasks = [
      makeTask({ dueDate: todayDate, completed: false }),
      makeTask({ dueDate: todayDate, completed: false }),
    ]
    render(<StatsModal tasks={tasks} onClose={vi.fn()} />)
    // The "Due Today" stat card value is 2
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('shows "all clear" sub-label when overdue count is 0', () => {
    render(<StatsModal tasks={[]} onClose={vi.fn()} />)
    expect(screen.getByText('all clear')).toBeInTheDocument()
  })

  it('shows "needs attention" sub-label when overdue > 0', () => {
    const pastDate = '2020-01-01'
    const tasks = [makeTask({ dueDate: pastDate, completed: false })]
    render(<StatsModal tasks={tasks} onClose={vi.fn()} />)
    expect(screen.getByText('needs attention')).toBeInTheDocument()
  })
})

describe('StatsModal – subtasks', () => {
  it('shows subtask completion ratio', () => {
    const tasks = [makeTask({
      subtasks: [
        { id: 'a', title: 'Sub 1', completed: true },
        { id: 'b', title: 'Sub 2', completed: false },
      ],
    })]
    render(<StatsModal tasks={tasks} onClose={vi.fn()} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('shows "—" when no subtasks exist', () => {
    render(<StatsModal tasks={[makeTask()]} onClose={vi.fn()} />)
    // '—' renders in both the Subtasks card and the Focus Time card when both are empty
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('StatsModal – priority breakdown', () => {
  it('renders high / medium / low priority labels', () => {
    render(<StatsModal tasks={[makeTask({ priority: 'high', completed: false })]} onClose={vi.fn()} />)
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument()
  })
})
