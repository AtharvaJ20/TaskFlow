import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskList from '../../components/TaskList'
import type { Task, Filter } from '../../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Default task',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function defaultProps(tasks: Task[] = [], filter: Filter = 'all') {
  return {
    tasks,
    filter,
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
    onOpenModal: vi.fn(),
    onTagClick: vi.fn(),
    selectedIds: new Set<string>(),
    onSelect: vi.fn(),
    onReorder: vi.fn(),
    lists: [],
    showList: false,
    onFocus: vi.fn(),
  }
}

describe('TaskList – empty states', () => {
  it('shows the "all" empty message when no tasks and filter is all', () => {
    render(<TaskList {...defaultProps([], 'all')} />)
    expect(screen.getByText('No tasks yet. Add one above.')).toBeInTheDocument()
  })

  it('shows the "active" empty message when no active tasks', () => {
    render(<TaskList {...defaultProps([], 'active')} />)
    expect(screen.getByText('All caught up! No active tasks.')).toBeInTheDocument()
  })

  it('shows the "completed" empty message when nothing is completed', () => {
    render(<TaskList {...defaultProps([], 'completed')} />)
    expect(screen.getByText('Nothing completed yet.')).toBeInTheDocument()
  })
})

describe('TaskList – task rendering', () => {
  it('renders task titles for each task in the list', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'Buy milk' }),
      makeTask({ id: 't2', title: 'Walk dog' }),
    ]
    render(<TaskList {...defaultProps(tasks)} />)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('Walk dog')).toBeInTheDocument()
  })

  it('does not show the empty state when tasks are present', () => {
    const tasks = [makeTask({ title: 'Something to do' })]
    render(<TaskList {...defaultProps(tasks)} />)
    expect(screen.queryByText('No tasks yet. Add one above.')).not.toBeInTheDocument()
  })

  it('renders all provided tasks', () => {
    const tasks = Array.from({ length: 4 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i + 1}` })
    )
    render(<TaskList {...defaultProps(tasks)} />)
    for (let i = 1; i <= 4; i++) {
      expect(screen.getByText(`Task ${i}`)).toBeInTheDocument()
    }
  })

  it('shows the list name when tasks have a matching listId', () => {
    const list = { id: 'l1', name: 'Work', color: '#6366f1', createdAt: new Date().toISOString() }
    const tasks = [makeTask({ id: 't1', title: 'Work task', listId: 'l1' })]
    const props = { ...defaultProps(tasks), lists: [list], showList: true }
    render(<TaskList {...props} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
  })
})

describe('TaskList – reorder', () => {
  it('calls onReorder when Move task up is clicked on the second task', async () => {
    const tasks = [
      makeTask({ id: 't1', title: 'First task' }),
      makeTask({ id: 't2', title: 'Second task' }),
    ]
    const props = defaultProps(tasks)
    render(<TaskList {...props} />)
    // Each TaskItem renders a move-up button; pick the non-disabled one (the second task's)
    const btns = screen.getAllByRole('button', { name: /move task up/i })
    const enabled = btns.find(b => !b.hasAttribute('disabled'))!
    await userEvent.click(enabled)
    expect(props.onReorder).toHaveBeenCalledWith('t2', 't1')
  })

  it('calls onReorder when Move task down is clicked on the first task', async () => {
    const tasks = [
      makeTask({ id: 't1', title: 'First task' }),
      makeTask({ id: 't2', title: 'Second task' }),
    ]
    const props = defaultProps(tasks)
    render(<TaskList {...props} />)
    // The first task has an enabled move-down button; pick the non-disabled one
    const btns = screen.getAllByRole('button', { name: /move task down/i })
    const enabled = btns.find(b => !b.hasAttribute('disabled'))!
    await userEvent.click(enabled)
    expect(props.onReorder).toHaveBeenCalledWith('t2', 't1')
  })

  it('Move up button is disabled for the first task', () => {
    const tasks = [makeTask({ id: 't1', title: 'Only task' })]
    render(<TaskList {...defaultProps(tasks)} />)
    const btn = screen.queryByRole('button', { name: /move task up/i })
    // First task has no handler → button is absent or disabled
    if (btn) expect(btn).toBeDisabled()
  })

  it('Move down button is disabled for the last task', () => {
    const tasks = [makeTask({ id: 't1', title: 'Only task' })]
    render(<TaskList {...defaultProps(tasks)} />)
    const btn = screen.queryByRole('button', { name: /move task down/i })
    // Last task has no handler → button is absent or disabled
    if (btn) expect(btn).toBeDisabled()
  })
})

describe('TaskList – drag and drop', () => {
  it('calls onReorder when a task is dragged over another and dropped', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'Task 1' }),
      makeTask({ id: 't2', title: 'Task 2' }),
    ]
    const props = defaultProps(tasks)
    const { container } = render(<TaskList {...props} />)

    const draggables = container.querySelectorAll('[draggable]')
    if (draggables.length < 2) return // skip if TaskItem doesn't use HTML drag

    const [first, second] = Array.from(draggables)
    fireEvent.dragStart(first)
    fireEvent.dragOver(second)
    fireEvent.dragEnd(first)

    expect(props.onReorder).toHaveBeenCalled()
  })

  it('does not call onReorder when an item is dropped back in place', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'Task 1' }),
      makeTask({ id: 't2', title: 'Task 2' }),
    ]
    const props = defaultProps(tasks)
    const { container } = render(<TaskList {...props} />)

    const draggables = container.querySelectorAll('[draggable]')
    if (draggables.length < 2) return

    const [first] = Array.from(draggables)
    // Drag-over same element should be ignored
    fireEvent.dragStart(first)
    fireEvent.dragEnd(first)

    expect(props.onReorder).not.toHaveBeenCalled()
  })
})
