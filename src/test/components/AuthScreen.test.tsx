import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AuthScreen from '../../components/AuthScreen'

function defaultProps() {
  return {
    onSignIn: vi.fn().mockResolvedValue(undefined),
    onSignUp: vi.fn().mockResolvedValue('done' as const),
    onGuest: vi.fn(),
    error: null,
  }
}

describe('AuthScreen – rendering', () => {
  it('shows the TaskFlow heading', () => {
    render(<AuthScreen {...defaultProps()} />)
    expect(screen.getByRole('heading', { name: /taskflow/i })).toBeInTheDocument()
  })

  it('shows Login and Sign up tabs', () => {
    render(<AuthScreen {...defaultProps()} />)
    // "Log in" appears in both the tab button and the submit button
    expect(screen.getAllByText('Log in').length).toBeGreaterThan(0)
    // "Sign up" only appears in the tab button (submit shows "Create account")
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('renders email and password inputs', () => {
    render(<AuthScreen {...defaultProps()} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders "Continue as guest" button', () => {
    render(<AuthScreen {...defaultProps()} />)
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument()
  })

  it('shows error message when error prop is provided', () => {
    render(<AuthScreen {...defaultProps()} error="Invalid credentials" />)
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })
})

describe('AuthScreen – tabs', () => {
  it('shows "Log in" as submit label by default (not "Create account")', () => {
    render(<AuthScreen {...defaultProps()} />)
    // Both the tab and the submit button show "Log in" — verify it's present
    expect(screen.getAllByText('Log in')).toHaveLength(2)
  })

  it('shows "Create account" submit button after switching to Sign up', async () => {
    render(<AuthScreen {...defaultProps()} />)
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })
})

describe('AuthScreen – interactions', () => {
  it('calls onGuest when "Continue as guest" is clicked', async () => {
    const props = defaultProps()
    render(<AuthScreen {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /continue as guest/i }))
    expect(props.onGuest).toHaveBeenCalledOnce()
  })

  it('calls onSignIn with email and password on login submit', async () => {
    const props = defaultProps()
    render(<AuthScreen {...props} />)
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123')
    // Submit via Enter — avoids ambiguity between tab and submit button
    await userEvent.keyboard('{Enter}')
    expect(props.onSignIn).toHaveBeenCalledWith('test@example.com', 'secret123')
  })

  it('calls onSignUp with email and password on signup submit', async () => {
    const props = defaultProps()
    render(<AuthScreen {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(props.onSignUp).toHaveBeenCalledWith('new@example.com', 'password123')
  })

  it('shows confirmation screen when signup returns "confirm"', async () => {
    const props = { ...defaultProps(), onSignUp: vi.fn().mockResolvedValue('confirm' as const) }
    render(<AuthScreen {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('returns to login from the confirmation screen', async () => {
    const props = { ...defaultProps(), onSignUp: vi.fn().mockResolvedValue('confirm' as const) }
    render(<AuthScreen {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'x@x.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await screen.findByText(/check your email/i)
    await userEvent.click(screen.getByRole('button', { name: /back to login/i }))
    // Back on the login screen — both tab and submit show "Log in"
    expect(screen.getAllByText('Log in').length).toBeGreaterThan(0)
  })
})
