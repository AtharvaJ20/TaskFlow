import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'

beforeEach(() => {
  localStorage.clear()
})

async function addTask(user: ReturnType<typeof userEvent.setup>, title: string): Promise<void> {
  const input = screen.getByRole('textbox', { name: /new task title/i })
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

    expect(screen.getByText(/2 active/i)).toBeInTheDocument()
  })

  it('completing a task removes it from the Active filter view', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Finish report')

    const checkbox = screen.getByRole('checkbox', { name: /mark as complete/i })
    await user.click(checkbox)

    await user.click(screen.getByRole('button', { name: /active/i }))

    expect(screen.queryByRole('button', { name: /edit task: finish report/i })).not.toBeInTheDocument()
  })

  it('deleting a task shows the undo snackbar with the task name', async () => {
    const user = userEvent.setup({})
    render(<App />)

    await addTask(user, 'Walk the dog')

    // Reveal and click the delete button
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
