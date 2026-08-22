import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'

// Mock supabase auth so the app transitions out of 'checking' mode immediately.
// Without this, getSession() never resolves in jsdom and the app stays on the
// loading spinner forever, making all task-input queries fail.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      updateUser: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
  // Enter guest mode so the app renders the task list instead of the auth screen
  localStorage.setItem('taskflow-guest', '1')
  // Mark tour as seen so the welcome overlay doesn't block the task input
  localStorage.setItem('taskflow-toured', '1')
})

// findByRole waits for async state transitions (checking → guest) before querying
async function addTask(user: ReturnType<typeof userEvent.setup>, title: string): Promise<void> {
  const input = await screen.findByRole('textbox', { name: /new task title/i })
  await user.clear(input)
  await user.type(input, title)
  await user.click(screen.getByRole('button', { name: /^add$/i }))
}

describe('App – task lifecycle integration', () => {
  it('adds a task and shows it in the list', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Buy groceries')

    expect(screen.getByRole('button', { name: /edit task: buy groceries/i })).toBeInTheDocument()
  })

  it('active count in the header reflects the number of incomplete tasks', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Task A')
    await addTask(user, 'Task B')

    expect(screen.getAllByText(/2 active/i)[0]).toBeInTheDocument()
  })

  it('completing a task removes it from the Active filter view', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Finish report')

    const checkbox = screen.getByRole('checkbox', { name: /mark as complete/i })
    await user.click(checkbox)

    await user.click(screen.getAllByRole('button', { name: /^active/i })[0])

    expect(screen.queryByRole('button', { name: /edit task: finish report/i })).not.toBeInTheDocument()
  })

  it('deleting a task shows the undo snackbar with the task name', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Walk the dog')

    const deleteBtn = screen.getByRole('button', { name: /delete task/i })
    await user.click(deleteBtn)

    const snackbar = screen.getByRole('status')
    expect(within(snackbar).getByText(/"Walk the dog" deleted/)).toBeInTheDocument()
    expect(within(snackbar).getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })

  it('clicking Undo restores the deleted task', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Walk the dog')
    await user.click(screen.getByRole('button', { name: /delete task/i }))

    const undo = within(screen.getByRole('status')).getByRole('button', { name: /undo/i })
    await user.click(undo)

    expect(screen.getByRole('button', { name: /edit task: walk the dog/i })).toBeInTheDocument()
  })

  // Auto-dismiss timing is proven in Snackbar unit tests — skip integration duplication

  it('search filters the task list to matching titles', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Buy groceries')
    await addTask(user, 'Call dentist')

    const searchInput = screen.getByRole('searchbox', { name: /search tasks/i })
    await user.type(searchInput, 'grocer')

    expect(screen.getByRole('button', { name: /edit task: buy groceries/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit task: call dentist/i })).not.toBeInTheDocument()
  })
})
