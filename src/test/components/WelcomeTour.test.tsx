import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import WelcomeTour from '../../components/WelcomeTour'

describe('WelcomeTour – rendering', () => {
  it('renders a dialog with an accessible label', () => {
    render(<WelcomeTour step={0} onNext={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the first step title on step 0', () => {
    render(<WelcomeTour step={0} onNext={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText('Welcome to TaskFlow')).toBeInTheDocument()
  })

  it('shows the correct title for step 2', () => {
    render(<WelcomeTour step={2} onNext={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText('Organize with Lists & Tags')).toBeInTheDocument()
  })

  it('shows the Skip tour button on non-final steps', () => {
    render(<WelcomeTour step={0} onNext={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByRole('button', { name: /skip tour/i })).toBeInTheDocument()
  })

  it('hides the Skip button on the last step', () => {
    render(<WelcomeTour step={5} onNext={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /skip tour/i })).not.toBeInTheDocument()
  })

  it('shows the CTA button text from the current step', () => {
    render(<WelcomeTour step={0} onNext={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByRole('button', { name: /show me around/i })).toBeInTheDocument()
  })

  it('shows "Get started" as the last step CTA', () => {
    render(<WelcomeTour step={5} onNext={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })
})

describe('WelcomeTour – interactions', () => {
  it('calls onNext when the CTA button is clicked', async () => {
    const onNext = vi.fn()
    render(<WelcomeTour step={0} onNext={onNext} onSkip={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /show me around/i }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('calls onSkip when the Skip tour button is clicked', async () => {
    const onSkip = vi.fn()
    render(<WelcomeTour step={0} onNext={vi.fn()} onSkip={onSkip} />)
    await userEvent.click(screen.getByRole('button', { name: /skip tour/i }))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('calls onNext when Next CTA is clicked on a middle step', async () => {
    const onNext = vi.fn()
    render(<WelcomeTour step={2} onNext={onNext} onSkip={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
