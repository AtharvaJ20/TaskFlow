import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BulkActionBar from '../../components/BulkActionBar'

function setup(overrides: { count?: number; onCompleteAll?: () => void; onDeleteAll?: () => void; onClear?: () => void } = {}) {
  const props = {
    count: 3,
    onCompleteAll: vi.fn(),
    onDeleteAll: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  }
  render(<BulkActionBar {...props} />)
  return props
}

describe('BulkActionBar', () => {
  it('renders a toolbar with an accessible label', () => {
    setup()
    expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument()
  })

  it('displays the selection count', () => {
    setup({ count: 7 })
    expect(screen.getByText('7 selected')).toBeInTheDocument()
  })

  it('calls onCompleteAll when Complete is clicked', async () => {
    const { onCompleteAll } = setup()
    await userEvent.click(screen.getByRole('button', { name: /complete/i }))
    expect(onCompleteAll).toHaveBeenCalledOnce()
  })

  it('calls onDeleteAll when Delete is clicked', async () => {
    const { onDeleteAll } = setup()
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDeleteAll).toHaveBeenCalledOnce()
  })

  it('calls onClear when the × button is clicked', async () => {
    const { onClear } = setup()
    await userEvent.click(screen.getByRole('button', { name: /clear selection/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('does not cross-fire callbacks', async () => {
    const { onCompleteAll, onDeleteAll, onClear } = setup()
    await userEvent.click(screen.getByRole('button', { name: /complete/i }))
    expect(onDeleteAll).not.toHaveBeenCalled()
    expect(onClear).not.toHaveBeenCalled()
    expect(onCompleteAll).toHaveBeenCalledOnce()
  })
})
