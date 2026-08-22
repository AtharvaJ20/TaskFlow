import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskInput from '../../components/TaskInput'

function setup() {
  const onAdd = vi.fn()
  render(<TaskInput onAdd={onAdd} lists={[]} goals={[]} />)
  return { onAdd, titleInput: screen.getByRole('textbox', { name: /new task title/i }) }
}

describe('TaskInput – task submission', () => {
  it('calls onAdd with the trimmed title when Add is clicked', async () => {
    const user = userEvent.setup()
    const { onAdd, titleInput } = setup()

    await user.type(titleInput, '  Buy groceries  ')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(onAdd).toHaveBeenCalledOnce()
    expect(onAdd.mock.calls[0][0].title).toBe('Buy groceries')
  })

  it('calls onAdd when Enter is pressed in the title input', async () => {
    const user = userEvent.setup()
    const { onAdd, titleInput } = setup()

    await user.type(titleInput, 'Task{Enter}')

    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('does not call onAdd when the title is blank', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()

    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(onAdd).not.toHaveBeenCalled()
  })

  it('resets the title input to empty after submission', async () => {
    const user = userEvent.setup()
    const { titleInput } = setup()

    await user.type(titleInput, 'Task{Enter}')

    expect(titleInput).toHaveValue('')
  })

  it('includes the selected priority in the onAdd payload', async () => {
    const user = userEvent.setup()
    const { onAdd, titleInput } = setup()

    await user.click(screen.getByRole('button', { name: /high/i }))
    await user.type(titleInput, 'Urgent{Enter}')

    expect(onAdd.mock.calls[0][0].priority).toBe('high')
  })
})

describe('TaskInput – tag management', () => {
  it('adds a tag on Enter and renders it as a chip', async () => {
    const user = userEvent.setup()
    setup()

    const tagInput = screen.getByRole('textbox', { name: /add tag/i })
    await user.type(tagInput, 'work{Enter}')

    expect(screen.getByText('work')).toBeInTheDocument()
  })

  it('adds a tag when a comma is typed', async () => {
    const user = userEvent.setup()
    setup()

    const tagInput = screen.getByRole('textbox', { name: /add tag/i })
    await user.type(tagInput, 'home,')

    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('removes a tag when its × button is clicked', async () => {
    const user = userEvent.setup()
    setup()

    const tagInput = screen.getByRole('textbox', { name: /add tag/i })
    await user.type(tagInput, 'work{Enter}')
    await user.click(screen.getByRole('button', { name: /remove tag work/i }))

    expect(screen.queryByText('work')).not.toBeInTheDocument()
  })

  it('does not add a duplicate tag', async () => {
    const user = userEvent.setup()
    setup()

    const tagInput = screen.getByRole('textbox', { name: /add tag/i })
    await user.type(tagInput, 'work{Enter}')
    await user.type(tagInput, 'work{Enter}')

    expect(screen.getAllByText('work')).toHaveLength(1)
  })

  it('hides the tag input once 5 tags are added', async () => {
    const user = userEvent.setup()
    setup()

    const tags = ['a', 'b', 'c', 'd', 'e']
    for (const tag of tags) {
      const tagInput = screen.getByRole('textbox', { name: /add tag/i })
      await user.type(tagInput, `${tag}{Enter}`)
    }

    expect(screen.queryByRole('textbox', { name: /add tag/i })).not.toBeInTheDocument()
  })
})

describe('TaskInput – priority selection', () => {
  it('shows Medium as pressed by default', () => {
    setup()
    expect(screen.getByRole('button', { name: /medium/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks the clicked priority as pressed and deselects others', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /high/i }))

    expect(screen.getByRole('button', { name: /high/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /medium/i })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /low/i })).toHaveAttribute('aria-pressed', 'false')
  })
})
