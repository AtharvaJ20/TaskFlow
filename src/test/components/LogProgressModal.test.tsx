import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LogProgressModal from '../../components/LogProgressModal'
import type { Goal } from '../../types/task'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    title: 'Run 100km',
    deadline: '2026-12-31',
    color: '#6366f1',
    createdAt: new Date().toISOString(),
    goalType: 'metric',
    startValue: 0,
    targetValue: 100,
    unit: 'km',
    ...overrides,
  }
}

describe('LogProgressModal – rendering', () => {
  it('shows the goal title', () => {
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Run 100km')).toBeInTheDocument()
  })

  it('shows current value and target in the summary line', () => {
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={vi.fn()} onClose={vi.fn()} />)
    // Values appear inside a <span> nested in a <p>; both elements match the regex
    expect(screen.getAllByText(/40km/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/100km/).length).toBeGreaterThan(0)
  })

  it('renders the unit label next to the input', () => {
    render(<LogProgressModal goal={makeGoal({ unit: 'pages' })} currentValue={10} onSave={vi.fn()} onClose={vi.fn()} />)
    // unit appears both in the summary and next to the input
    expect(screen.getAllByText('pages').length).toBeGreaterThan(0)
  })

  it('omits unit label when goal has no unit', () => {
    render(<LogProgressModal goal={makeGoal({ unit: undefined })} currentValue={5} onSave={vi.fn()} onClose={vi.fn()} />)
    // No standalone unit chip visible alongside the input
    expect(screen.queryByText('km')).not.toBeInTheDocument()
  })

  it('renders a dialog with accessible label', () => {
    render(<LogProgressModal goal={makeGoal()} currentValue={0} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: /Run 100km/i })).toBeInTheDocument()
  })
})

describe('LogProgressModal – validation', () => {
  it('disables the Save button when value field is cleared', async () => {
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText(/current value/i))
    expect(screen.getByRole('button', { name: /log progress/i })).toBeDisabled()
  })

  it('enables the Save button when a valid number is entered', async () => {
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByLabelText(/current value/i)
    await userEvent.clear(input)
    await userEvent.type(input, '75')
    expect(screen.getByRole('button', { name: /log progress/i })).not.toBeDisabled()
  })

  it('shows a live preview percentage', async () => {
    render(<LogProgressModal goal={makeGoal({ startValue: 0, targetValue: 100 })} currentValue={0} onSave={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByLabelText(/current value/i)
    await userEvent.clear(input)
    await userEvent.type(input, '50')
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('clamps preview to 100% when value exceeds target', async () => {
    render(<LogProgressModal goal={makeGoal({ startValue: 0, targetValue: 100 })} currentValue={0} onSave={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByLabelText(/current value/i)
    await userEvent.clear(input)
    await userEvent.type(input, '150')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

describe('LogProgressModal – interactions', () => {
  it('calls onSave with the numeric value when Save is clicked', async () => {
    const onSave = vi.fn()
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={onSave} onClose={vi.fn()} />)
    const input = screen.getByLabelText(/current value/i)
    await userEvent.clear(input)
    await userEvent.type(input, '75')
    await userEvent.click(screen.getByRole('button', { name: /log progress/i }))
    expect(onSave).toHaveBeenCalledWith(75, undefined)
  })

  it('passes a trimmed note to onSave when provided', async () => {
    const onSave = vi.fn()
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/note/i), '  Good session  ')
    await userEvent.click(screen.getByRole('button', { name: /log progress/i }))
    expect(onSave).toHaveBeenCalledWith(40, 'Good session')
  })

  it('passes undefined note when note field is blank', async () => {
    const onSave = vi.fn()
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /log progress/i }))
    expect(onSave).toHaveBeenCalledWith(40, undefined)
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn()
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={vi.fn()} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('saves on Enter key press in the value input', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={onSave} onClose={onClose} />)
    await userEvent.click(screen.getByLabelText(/current value/i))
    await userEvent.keyboard('{Enter}')
    expect(onSave).toHaveBeenCalledWith(40, undefined)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('saves on Enter key press in the note input', async () => {
    const onSave = vi.fn()
    render(<LogProgressModal goal={makeGoal()} currentValue={40} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/note/i), 'steady{Enter}')
    expect(onSave).toHaveBeenCalledWith(40, 'steady')
  })
})
