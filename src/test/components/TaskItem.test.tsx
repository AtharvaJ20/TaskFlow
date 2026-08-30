import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskItem from '../../components/TaskItem'
import type { Task } from '../../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy groceries',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function defaultProps(task: Task) {
  return {
    task,
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onOpenModal: vi.fn(),
    onTagClick: vi.fn(),
    selected: false,
    onSelect: vi.fn(),
    selectionActive: false,
  }
}

describe('TaskItem – rendering', () => {
  it('renders the task title', () => {
    render(<TaskItem {...defaultProps(makeTask())} />)
    expect(screen.getByText('Buy groceries')).toBeInTheDocument()
  })

  it('shows priority badge', () => {
    render(<TaskItem {...defaultProps(makeTask({ priority: 'high' }))} />)
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('shows "Pinned" label when task is pinned', () => {
    render(<TaskItem {...defaultProps(makeTask({ pinned: true }))} />)
    expect(screen.getByText('Pinned')).toBeInTheDocument()
  })

  it('shows subtask ratio when subtasks exist', () => {
    const task = makeTask({ subtasks: [
      { id: 's1', title: 'Sub 1', completed: true },
      { id: 's2', title: 'Sub 2', completed: false },
    ]})
    render(<TaskItem {...defaultProps(task)} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('shows time logged when > 0', () => {
    render(<TaskItem {...defaultProps(makeTask({ timeLogged: 300 }))} />)
    expect(screen.getByText('5m')).toBeInTheDocument()
  })

  it('shows tags', () => {
    render(<TaskItem {...defaultProps(makeTask({ tags: ['work', 'urgent'] }))} />)
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })

  it('shows due date when present', () => {
    const today = new Date().toISOString().slice(0, 10)
    render(<TaskItem {...defaultProps(makeTask({ dueDate: today }))} />)
    // Date is formatted as "Aug 30" etc — check the "Due today" badge
    expect(screen.getByText('Due today')).toBeInTheDocument()
  })

  it('shows "Overdue" badge for past due date', () => {
    render(<TaskItem {...defaultProps(makeTask({ dueDate: '2020-01-01' }))} />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('shows recurrence label for recurring tasks', () => {
    const task = makeTask({ recurrence: { frequency: 'daily', interval: 1 } })
    render(<TaskItem {...defaultProps(task)} />)
    expect(screen.getByLabelText(/repeats daily/i)).toBeInTheDocument()
  })

  it('shows list name when showList and taskList are provided', () => {
    const taskList = { id: 'l1', name: 'Work', color: '#6366f1', createdAt: new Date().toISOString() }
    render(<TaskItem {...defaultProps(makeTask())} showList taskList={taskList} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
  })
})

describe('TaskItem – interactions', () => {
  it('calls onToggle when completion checkbox is clicked', async () => {
    const props = defaultProps(makeTask())
    render(<TaskItem {...props} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /mark as complete/i }))
    expect(props.onToggle).toHaveBeenCalledWith('task-1')
  })

  it('calls onOpenModal when task title is clicked', async () => {
    const props = defaultProps(makeTask())
    render(<TaskItem {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /edit task: buy groceries/i }))
    expect(props.onOpenModal).toHaveBeenCalledWith(props.task)
  })

  it('calls onTagClick when a tag is clicked', async () => {
    const props = defaultProps(makeTask({ tags: ['design'] }))
    render(<TaskItem {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /filter by tag: design/i }))
    expect(props.onTagClick).toHaveBeenCalledWith('design')
  })

  it('calls onDelete when delete button is clicked', async () => {
    const props = defaultProps(makeTask())
    render(<TaskItem {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    expect(props.onDelete).toHaveBeenCalledWith('task-1')
  })

  it('calls onUpdate with pinned:true when pin button clicked on unpinned task', async () => {
    const props = defaultProps(makeTask({ pinned: false }))
    render(<TaskItem {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /pin task/i }))
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', { pinned: true })
  })

  it('calls onUpdate with pinned:false when unpin button clicked on pinned task', async () => {
    const props = defaultProps(makeTask({ pinned: true }))
    render(<TaskItem {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /unpin task/i }))
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', { pinned: false })
  })

  it('calls onFocus when Focus button is clicked', async () => {
    const onFocus = vi.fn()
    const task = makeTask()
    render(<TaskItem {...defaultProps(task)} onFocus={onFocus} />)
    await userEvent.click(screen.getByRole('button', { name: /focus on: buy groceries/i }))
    expect(onFocus).toHaveBeenCalledWith(task)
  })

  it('calls onSelect when selection checkbox is clicked', async () => {
    const props = defaultProps(makeTask())
    render(<TaskItem {...props} selectionActive />)
    await userEvent.click(screen.getByRole('checkbox', { name: /select "buy groceries"/i }))
    expect(props.onSelect).toHaveBeenCalledWith('task-1')
  })

  it('enters inline edit mode on double-click and saves on Enter', async () => {
    const props = defaultProps(makeTask({ title: 'Old title' }))
    render(<TaskItem {...props} />)
    await userEvent.dblClick(screen.getByRole('button', { name: /edit task: old title/i }))
    const input = screen.getByLabelText(/edit task title/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'New title{Enter}')
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', { title: 'New title' })
  })
})
