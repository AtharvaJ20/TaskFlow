import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FocusMode from '../../components/FocusMode'
import type { Task } from '../../types/task'

vi.mock('../../utils/soundSettings', () => ({
  loadSoundSettingsFull: vi.fn(() => ({})),
  playAlert: vi.fn(),
}))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'focus-1',
    title: 'Write tests',
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
    onClose: vi.fn(),
    onComplete: vi.fn(),
    onToggleSubtask: vi.fn(),
    onLogTime: vi.fn(),
  }
}

describe('FocusMode – rendering', () => {
  it('renders a dialog with focus mode label', () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    expect(screen.getByRole('dialog', { name: /focus mode/i })).toBeInTheDocument()
  })

  it('shows the task title', () => {
    render(<FocusMode {...defaultProps(makeTask({ title: 'Review PR' }))} />)
    expect(screen.getByText('Review PR')).toBeInTheDocument()
  })

  it('shows the initial timer at 25:00', () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('shows Focus and Break mode tabs', () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    expect(screen.getByRole('button', { name: /^focus$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^break$/i })).toBeInTheDocument()
  })

  it('shows Start timer button initially', () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument()
  })

  it('shows Reset timer button', () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    expect(screen.getByRole('button', { name: /reset timer/i })).toBeInTheDocument()
  })

  it('shows Exit focus mode button', () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    expect(screen.getByRole('button', { name: /exit focus mode/i })).toBeInTheDocument()
  })

  it('shows "Mark complete & exit" for an incomplete task', () => {
    render(<FocusMode {...defaultProps(makeTask({ completed: false }))} />)
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument()
  })

  it('hides "Mark complete & exit" for an already-completed task', () => {
    render(<FocusMode {...defaultProps(makeTask({ completed: true }))} />)
    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument()
  })

  it('shows duration chip values for Focus and Break', () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    expect(screen.getByText('25m')).toBeInTheDocument()
    expect(screen.getByText('5m')).toBeInTheDocument()
  })

  it('shows task description when provided', () => {
    const task = makeTask({ description: 'Finish the auth module' })
    render(<FocusMode {...defaultProps(task)} />)
    expect(screen.getByText('Finish the auth module')).toBeInTheDocument()
  })

  it('shows subtask count and subtask items', () => {
    const task = makeTask({
      subtasks: [
        { id: 's1', title: 'First step', completed: false },
        { id: 's2', title: 'Second step', completed: true },
      ],
    })
    render(<FocusMode {...defaultProps(task)} />)
    expect(screen.getByText('1/2 subtasks')).toBeInTheDocument()
    expect(screen.getByText('First step')).toBeInTheDocument()
    expect(screen.getByText('Second step')).toBeInTheDocument()
  })

  it('shows total time logged when timeLogged > 0', () => {
    const task = makeTask({ timeLogged: 3600 })
    render(<FocusMode {...defaultProps(task)} />)
    expect(screen.getByText(/total/)).toBeInTheDocument()
  })
})

describe('FocusMode – interactions', () => {
  it('calls onClose when the Exit button is clicked', async () => {
    const props = defaultProps(makeTask())
    render(<FocusMode {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /exit focus mode/i }))
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('calls onComplete and onClose when "Mark complete & exit" is clicked', async () => {
    const props = defaultProps(makeTask({ id: 'task-99' }))
    render(<FocusMode {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /mark complete/i }))
    expect(props.onComplete).toHaveBeenCalledWith('task-99')
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('calls onToggleSubtask when a subtask toggle is clicked', async () => {
    const props = defaultProps(makeTask({
      id: 'task-1',
      subtasks: [{ id: 'sub-1', title: 'Buy coffee', completed: false }],
    }))
    render(<FocusMode {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /buy coffee/i }))
    expect(props.onToggleSubtask).toHaveBeenCalledWith('task-1', 'sub-1')
  })

  it('switches to Break mode and shows 05:00', async () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    await userEvent.click(screen.getByRole('button', { name: /^break$/i }))
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  it('shows Pause timer button after Start is clicked', async () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    await userEvent.click(screen.getByRole('button', { name: /start timer/i }))
    expect(screen.getByRole('button', { name: /pause timer/i })).toBeInTheDocument()
  })

  it('returns to Start timer after Pause is clicked', async () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    await userEvent.click(screen.getByRole('button', { name: /start timer/i }))
    await userEvent.click(screen.getByRole('button', { name: /pause timer/i }))
    expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', async () => {
    const props = defaultProps(makeTask())
    render(<FocusMode {...props} />)
    await userEvent.keyboard('{Escape}')
    expect(props.onClose).toHaveBeenCalledOnce()
  })
})

describe('FocusMode – DurationChip', () => {
  it('enters edit mode when the Focus chip is clicked', async () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    // Query by title — the chip title is "Click to change focus duration"
    await userEvent.click(screen.getByTitle(/click to change focus duration/i))
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('saves new Focus duration when Set is clicked', async () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    await userEvent.click(screen.getByTitle(/click to change focus duration/i))
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '30')
    await userEvent.click(screen.getByRole('button', { name: /^set$/i }))
    expect(screen.getByText('30m')).toBeInTheDocument()
  })

  it('cancels edit on Escape — input is removed', async () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    await userEvent.click(screen.getByTitle(/click to change focus duration/i))
    const input = screen.getByRole('spinbutton')
    // Focus the input explicitly (chip uses setTimeout to select, not autofocus)
    await userEvent.click(input)
    await userEvent.keyboard('{Escape}')
    // Chip returns to button mode — spinbutton gone
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('both chips become disabled when timer is running', async () => {
    render(<FocusMode {...defaultProps(makeTask())} />)
    await userEvent.click(screen.getByRole('button', { name: /start timer/i }))
    // Both Focus and Break chips show the "pause to edit" title
    expect(screen.getAllByTitle(/pause the timer to edit/i).length).toBe(2)
  })
})
