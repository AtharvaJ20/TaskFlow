import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import HelpModal from '../../components/HelpModal'

describe('HelpModal – structure', () => {
  it('renders a dialog', () => {
    render(<HelpModal onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the Help heading', () => {
    render(<HelpModal onClose={vi.fn()} />)
    expect(screen.getAllByText(/help/i).length).toBeGreaterThan(0)
  })

  it('shows section headings for Adding Tasks', () => {
    render(<HelpModal onClose={vi.fn()} />)
    // "Adding Tasks" appears in both a nav pill and the section h3
    expect(screen.getAllByText('Adding Tasks').length).toBeGreaterThan(0)
  })

  it('shows content for at least one help item', () => {
    render(<HelpModal onClose={vi.fn()} />)
    expect(screen.getByText('Create a task')).toBeInTheDocument()
  })
})

describe('HelpModal – interactions', () => {
  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<HelpModal onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn()
    render(<HelpModal onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows "Replay tour" button when onReplayTour is provided', () => {
    render(<HelpModal onClose={vi.fn()} onReplayTour={vi.fn()} />)
    expect(screen.getByRole('button', { name: /replay tour/i })).toBeInTheDocument()
  })

  it('calls onReplayTour when "Replay tour" is clicked', async () => {
    const onClose = vi.fn()
    const onReplayTour = vi.fn()
    render(<HelpModal onClose={onClose} onReplayTour={onReplayTour} />)
    await userEvent.click(screen.getByRole('button', { name: /replay tour/i }))
    expect(onReplayTour).toHaveBeenCalledOnce()
    // The "Replay tour" button only calls onReplayTour — onClose is the separate × button
  })

  it('does not show "Replay tour" button when onReplayTour is not provided', () => {
    render(<HelpModal onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /replay tour/i })).not.toBeInTheDocument()
  })
})
