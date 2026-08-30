import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskModal from '../../components/TaskModal'
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

function defaultProps() {
  return {
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onAddSubtask: vi.fn(),
    onToggleSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(),
    lists: [],
    goals: [],
  }
}

describe('TaskModal – null state', () => {
  it('renders nothing when task is null', () => {
    const { container } = render(<TaskModal task={null} {...defaultProps()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('TaskModal – rendering', () => {
  it('shows the task title in the editable input', () => {
    render(<TaskModal task={makeTask()} {...defaultProps()} />)
    expect(screen.getByDisplayValue('Buy groceries')).toBeInTheDocument()
  })

  it('shows the task description when present', () => {
    render(<TaskModal task={makeTask({ description: 'Milk and eggs' })} {...defaultProps()} />)
    expect(screen.getByDisplayValue('Milk and eggs')).toBeInTheDocument()
  })

  it('shows existing tags as chips', () => {
    render(<TaskModal task={makeTask({ tags: ['work', 'urgent'] })} {...defaultProps()} />)
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })

  it('shows formatted time logged when > 0', () => {
    render(<TaskModal task={makeTask({ timeLogged: 300 })} {...defaultProps()} />)
    expect(screen.getByText('5m')).toBeInTheDocument()
  })

  it('does not show time section when timeLogged is 0', () => {
    render(<TaskModal task={makeTask({ timeLogged: 0 })} {...defaultProps()} />)
    expect(screen.queryByText(/time logged/i)).not.toBeInTheDocument()
  })

  it('shows "Pinned" label when task is pinned', () => {
    render(<TaskModal task={makeTask({ pinned: true })} {...defaultProps()} />)
    expect(screen.getByRole('button', { name: /pinned/i })).toBeInTheDocument()
  })

  it('shows subtask list when task has subtasks', () => {
    const task = makeTask({ subtasks: [{ id: 's1', title: 'Step one', completed: false }] })
    render(<TaskModal task={task} {...defaultProps()} />)
    expect(screen.getByText('Step one')).toBeInTheDocument()
  })

  it('shows subtask done count', () => {
    const task = makeTask({ subtasks: [
      { id: 's1', title: 'Sub 1', completed: true },
      { id: 's2', title: 'Sub 2', completed: false },
    ]})
    render(<TaskModal task={task} {...defaultProps()} />)
    expect(screen.getByText('1/2 done')).toBeInTheDocument()
  })
})

describe('TaskModal – close behaviours', () => {
  it('calls onClose when the × header button is clicked', async () => {
    const onClose = vi.fn()
    render(<TaskModal task={makeTask()} {...defaultProps()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close modal/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<TaskModal task={makeTask()} {...defaultProps()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn()
    render(<TaskModal task={makeTask()} {...defaultProps()} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('TaskModal – save', () => {
  it('calls onUpdate with changed title and closes', async () => {
    const props = defaultProps()
    render(<TaskModal task={makeTask({ title: 'Old title', id: 'task-1' })} {...props} />)
    const input = screen.getByDisplayValue('Old title')
    await userEvent.clear(input)
    await userEvent.type(input, 'New title')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', expect.objectContaining({ title: 'New title' }))
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('calls onUpdate with changed priority', async () => {
    const props = defaultProps()
    render(<TaskModal task={makeTask({ priority: 'medium', id: 'task-1' })} {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^high$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', expect.objectContaining({ priority: 'high' }))
  })

  it('calls onUpdate with changed description', async () => {
    const props = defaultProps()
    render(<TaskModal task={makeTask({ description: '', id: 'task-1' })} {...props} />)
    await userEvent.type(screen.getByPlaceholderText(/add a description/i), 'New description')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', expect.objectContaining({ description: 'New description' }))
  })

  it('does not include unchanged fields in the update payload', async () => {
    const props = defaultProps()
    const task = makeTask({ title: 'Same title', priority: 'medium', tags: [] })
    render(<TaskModal task={task} {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    // called with an empty changes object (no diff)
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', {})
  })
})

describe('TaskModal – delete', () => {
  it('calls onDelete with the task id and closes', async () => {
    const props = defaultProps()
    render(<TaskModal task={makeTask({ id: 'task-1' })} {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(props.onDelete).toHaveBeenCalledWith('task-1')
    expect(props.onClose).toHaveBeenCalledOnce()
  })
})

describe('TaskModal – pin', () => {
  it('calls onUpdate with pinned:true when task is unpinned', async () => {
    const props = defaultProps()
    render(<TaskModal task={makeTask({ pinned: false, id: 'task-1' })} {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^pin$/i }))
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', { pinned: true })
  })

  it('calls onUpdate with pinned:false when task is already pinned', async () => {
    const props = defaultProps()
    render(<TaskModal task={makeTask({ pinned: true, id: 'task-1' })} {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /pinned/i }))
    expect(props.onUpdate).toHaveBeenCalledWith('task-1', { pinned: false })
  })
})

describe('TaskModal – tags', () => {
  it('adds a tag on Enter key', async () => {
    render(<TaskModal task={makeTask({ tags: [] })} {...defaultProps()} />)
    await userEvent.type(screen.getByPlaceholderText(/add tag/i), 'design{Enter}')
    expect(screen.getByText('design')).toBeInTheDocument()
  })

  it('adds a tag when a comma is typed', async () => {
    render(<TaskModal task={makeTask({ tags: [] })} {...defaultProps()} />)
    await userEvent.type(screen.getByPlaceholderText(/add tag/i), 'backend,')
    expect(screen.getByText('backend')).toBeInTheDocument()
  })

  it('does not add a duplicate tag', async () => {
    render(<TaskModal task={makeTask({ tags: ['work'] })} {...defaultProps()} />)
    await userEvent.type(screen.getByPlaceholderText(/add tag/i), 'work{Enter}')
    expect(screen.getAllByText('work')).toHaveLength(1)
  })

  it('removes a tag when its × button is clicked', async () => {
    render(<TaskModal task={makeTask({ tags: ['shopping', 'urgent'] })} {...defaultProps()} />)
    await userEvent.click(screen.getByRole('button', { name: /remove tag shopping/i }))
    expect(screen.queryByText('shopping')).not.toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })
})

describe('TaskModal – subtasks', () => {
  it('calls onAddSubtask on Enter in the subtask input', async () => {
    const props = defaultProps()
    render(<TaskModal task={makeTask({ id: 'task-1' })} {...props} />)
    await userEvent.type(screen.getByLabelText(/new subtask title/i), 'Do laundry{Enter}')
    expect(props.onAddSubtask).toHaveBeenCalledWith('task-1', 'Do laundry')
  })

  it('calls onToggleSubtask when a subtask checkbox is clicked', async () => {
    const props = defaultProps()
    const task = makeTask({ id: 'task-1', subtasks: [{ id: 'sub-1', title: 'Step one', completed: false }] })
    render(<TaskModal task={task} {...props} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /mark subtask "Step one" complete/i }))
    expect(props.onToggleSubtask).toHaveBeenCalledWith('task-1', 'sub-1')
  })

  it('calls onDeleteSubtask when the subtask delete button is clicked', async () => {
    const props = defaultProps()
    const task = makeTask({ id: 'task-1', subtasks: [{ id: 'sub-1', title: 'Step one', completed: false }] })
    render(<TaskModal task={task} {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /delete subtask "Step one"/i }))
    expect(props.onDeleteSubtask).toHaveBeenCalledWith('task-1', 'sub-1')
  })
})

describe('TaskModal – recurrence', () => {
  it('renders the recurrence frequency dropdown', () => {
    render(<TaskModal task={makeTask()} {...defaultProps()} />)
    expect(screen.getByRole('combobox', { name: /recurrence frequency/i })).toBeInTheDocument()
  })

  it('shows custom day pickers when "Custom days" is selected', async () => {
    render(<TaskModal task={makeTask()} {...defaultProps()} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /recurrence frequency/i }), 'custom')
    expect(screen.getByRole('button', { name: /monday/i })).toBeInTheDocument()
  })

  it('hides custom day pickers when frequency changes away from custom', async () => {
    render(<TaskModal task={makeTask()} {...defaultProps()} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /recurrence frequency/i }), 'custom')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /recurrence frequency/i }), 'daily')
    expect(screen.queryByRole('button', { name: /monday/i })).not.toBeInTheDocument()
  })
})

describe('TaskModal – lists and goals', () => {
  it('shows list selector when lists are provided', () => {
    const lists = [{ id: 'l1', name: 'Work', color: '#6366f1', createdAt: new Date().toISOString() }]
    render(<TaskModal task={makeTask()} {...defaultProps()} lists={lists} />)
    expect(screen.getByRole('combobox', { name: /task list/i })).toBeInTheDocument()
  })

  it('shows goal selector when goals are provided', () => {
    const goals = [{
      id: 'g1', title: 'My Goal', deadline: '2026-12-31', color: '#6366f1',
      createdAt: new Date().toISOString(), goalType: 'task' as const,
    }]
    render(<TaskModal task={makeTask()} {...defaultProps()} goals={goals} />)
    expect(screen.getByRole('combobox', { name: /goal/i })).toBeInTheDocument()
  })

  it('does not show list selector when no lists exist', () => {
    render(<TaskModal task={makeTask()} {...defaultProps()} lists={[]} />)
    expect(screen.queryByRole('combobox', { name: /task list/i })).not.toBeInTheDocument()
  })
})
