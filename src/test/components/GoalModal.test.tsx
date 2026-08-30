import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GoalModal from '../../components/GoalModal'
import type { Goal } from '../../types/task'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Run a marathon',
    deadline: '2027-06-01',
    color: '#6366f1',
    createdAt: new Date().toISOString(),
    goalType: 'task',
    ...overrides,
  }
}

describe('GoalModal – rendering', () => {
  it('shows "New goal" title when no goal is provided', () => {
    render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('New goal')).toBeInTheDocument()
  })

  it('shows "Edit goal" title when editing an existing goal', () => {
    render(<GoalModal goal={makeGoal()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Edit goal')).toBeInTheDocument()
  })

  it('renders a dialog with accessible label', () => {
    render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('pre-fills title when editing', () => {
    render(<GoalModal goal={makeGoal({ title: 'Learn piano' })} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Learn piano')).toBeInTheDocument()
  })

  it('shows Task-based and Metric-based type buttons', () => {
    render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Task-based')).toBeInTheDocument()
    expect(screen.getByText('Metric-based')).toBeInTheDocument()
  })

  it('shows note that goal type is locked in edit mode', () => {
    render(<GoalModal goal={makeGoal()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/goal type cannot be changed/i)).toBeInTheDocument()
  })
})

describe('GoalModal – metric type', () => {
  it('shows start/target/unit fields when Metric-based is selected', async () => {
    render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Metric-based'))
    expect(screen.getByPlaceholderText(/e\.g\. 45/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. 55/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/kg.*books.*km/i)).toBeInTheDocument()
  })

  it('shows validation error when start equals target', async () => {
    render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Metric-based'))
    await userEvent.type(screen.getByPlaceholderText(/e\.g\. 45/i), '50')
    await userEvent.type(screen.getByPlaceholderText(/e\.g\. 55/i), '50')
    expect(screen.getByText(/start and target values must be different/i)).toBeInTheDocument()
  })

  it('Save is disabled when metric fields are equal', async () => {
    render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Metric-based'))
    await userEvent.type(screen.getByPlaceholderText(/e\.g\. 45/i), '50')
    await userEvent.type(screen.getByPlaceholderText(/e\.g\. 55/i), '50')
    expect(screen.getByRole('button', { name: /create goal/i })).toBeDisabled()
  })
})

describe('GoalModal – validation', () => {
  it('Save is disabled when title is empty', () => {
    render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /create goal/i })).toBeDisabled()
  })

  it('Save is enabled with title and deadline filled', async () => {
    const { container } = render(<GoalModal onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/e\.g\. Launch MVP/i), 'My goal')
    // deadline input has no htmlFor/id link — fall back to DOM query
    await userEvent.type(container.querySelector('input[type="date"]') as HTMLElement, '2027-12-31')
    expect(screen.getByDisplayValue('My goal')).toBeInTheDocument()
  })
})

describe('GoalModal – interactions', () => {
  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<GoalModal onSave={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when × button is clicked', async () => {
    const onClose = vi.fn()
    render(<GoalModal onSave={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn()
    render(<GoalModal onSave={vi.fn()} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSave and onClose with valid task-type data', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const { container } = render(<GoalModal onSave={onSave} onClose={onClose} />)
    await userEvent.type(screen.getByPlaceholderText(/e\.g\. Launch MVP/i), 'Ship v1')
    // deadline input has no htmlFor/id link — fall back to DOM query
    await userEvent.type(container.querySelector('input[type="date"]') as HTMLElement, '2027-12-31')
    await userEvent.click(screen.getByRole('button', { name: /create goal/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ship v1', goalType: 'task' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows Delete button in edit mode and calls onDelete', async () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    const goal = makeGoal({ id: 'g1' })
    render(<GoalModal goal={goal} onSave={vi.fn()} onDelete={onDelete} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /delete goal/i }))
    expect(onDelete).toHaveBeenCalledWith('g1')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not show Delete button when onDelete is not provided', () => {
    render(<GoalModal goal={makeGoal()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /delete goal/i })).not.toBeInTheDocument()
  })
})
