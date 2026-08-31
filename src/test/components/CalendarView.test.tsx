import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import CalendarView from '../../components/CalendarView'
import type { Task } from '../../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Write tests',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('CalendarView – structure', () => {
  it('shows the current month and year in the header', () => {
    render(<CalendarView tasks={[]} onOpenModal={vi.fn()} />)
    const monthYear = format(new Date(), 'MMMM yyyy')
    expect(screen.getByText(monthYear)).toBeInTheDocument()
  })

  it('renders all 7 weekday headers', () => {
    render(<CalendarView tasks={[]} onOpenModal={vi.fn()} />)
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('renders Previous month and Next month navigation buttons', () => {
    render(<CalendarView tasks={[]} onOpenModal={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument()
  })
})

describe('CalendarView – navigation', () => {
  it('advances to next month when Next is clicked', async () => {
    render(<CalendarView tasks={[]} onOpenModal={vi.fn()} />)
    // Pin to day 1 before adding a month to avoid overflow (e.g. Aug 31 + 1mo = Oct 1)
    const next = new Date()
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
    await userEvent.click(screen.getByRole('button', { name: /next month/i }))
    expect(screen.getByText(format(next, 'MMMM yyyy'))).toBeInTheDocument()
  })

  it('goes back to previous month when Previous is clicked', async () => {
    render(<CalendarView tasks={[]} onOpenModal={vi.fn()} />)
    const prev = new Date()
    prev.setDate(1)
    prev.setMonth(prev.getMonth() - 1)
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByText(format(prev, 'MMMM yyyy'))).toBeInTheDocument()
  })
})

describe('CalendarView – tasks', () => {
  it('shows a task on its due date', () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const task = makeTask({ title: 'Team standup', dueDate: todayStr })
    render(<CalendarView tasks={[task]} onOpenModal={vi.fn()} />)
    expect(screen.getByText('Team standup')).toBeInTheDocument()
  })

  it('calls onOpenModal when a task button is clicked', async () => {
    const onOpenModal = vi.fn()
    const todayStr = new Date().toISOString().slice(0, 10)
    const task = makeTask({ title: 'Team standup', dueDate: todayStr })
    render(<CalendarView tasks={[task]} onOpenModal={onOpenModal} />)
    await userEvent.click(screen.getByRole('button', { name: /team standup/i }))
    expect(onOpenModal).toHaveBeenCalledWith(task)
  })

  it('shows "+N more" when a day has more than 3 tasks', () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i + 1}`, dueDate: todayStr })
    )
    render(<CalendarView tasks={tasks} onOpenModal={vi.fn()} />)
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })
})
