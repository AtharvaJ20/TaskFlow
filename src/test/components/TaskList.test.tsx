import { render, screen } from '@testing-library/react'
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
})
