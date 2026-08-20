import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Snackbar from '../../components/Snackbar'

function setup(overrides: Partial<Parameters<typeof Snackbar>[0]> = {}) {
  const onAction  = vi.fn()
  const onDismiss = vi.fn()
  render(
    <Snackbar
      message="Task deleted"
      actionLabel="Undo"
      onAction={onAction}
      onDismiss={onDismiss}
      {...overrides}
    />
  )
  return { onAction, onDismiss }
}

describe('Snackbar – rendering', () => {
  it('renders the message and action label', () => {
    setup()
    expect(screen.getByText('Task deleted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })

  it('has role="status" and aria-live="polite"', () => {
    setup()
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
  })
})

// Interactions do not need fake timers — real timers fine for click events
describe('Snackbar – interactions', () => {
  it('calls onAction when Undo is clicked', async () => {
    const user = userEvent.setup()
    const { onAction } = setup()

    await user.click(screen.getByRole('button', { name: /undo/i }))

    expect(onAction).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when the dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const { onDismiss } = setup()

    await user.click(screen.getByRole('button', { name: /dismiss/i }))

    expect(onDismiss).toHaveBeenCalledOnce()
  })
})

// Auto-dismiss needs fake timers scoped to this block only
describe('Snackbar – auto-dismiss', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('calls onDismiss after the default 5 s duration', () => {
    const { onDismiss } = setup()

    vi.advanceTimersByTime(4999)
    expect(onDismiss).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('respects a custom duration prop', () => {
    const { onDismiss } = setup({ duration: 2000 })

    vi.advanceTimersByTime(1999)
    expect(onDismiss).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
