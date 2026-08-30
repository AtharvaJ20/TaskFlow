import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GoalsView from '../../components/GoalsView'
import type { Goal, Task, GoalProgressEntry } from '../../types/task'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Launch MVP',
    deadline: '2027-12-31',
    color: '#6366f1',
    createdAt: new Date().toISOString(),
    goalType: 'task',
    ...overrides,
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Write tests',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function defaultProps() {
  return {
    goals: [] as Goal[],
    tasks: [] as Task[],
    entries: [] as GoalProgressEntry[],
    onEditGoal: vi.fn(),
    onNewGoal: vi.fn(),
    onTaskClick: vi.fn(),
    onToggleTask: vi.fn(),
    onLogProgress: vi.fn(),
  }
}

describe('GoalsView – empty state', () => {
  it('shows "No goals yet" heading when goals array is empty', () => {
    render(<GoalsView {...defaultProps()} />)
    expect(screen.getByText('No goals yet')).toBeInTheDocument()
  })

  it('calls onNewGoal when "Create your first goal" is clicked', async () => {
    const props = defaultProps()
    render(<GoalsView {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /create your first goal/i }))
    expect(props.onNewGoal).toHaveBeenCalledOnce()
  })
})

describe('GoalsView – with goals', () => {
  it('shows goal count in header', () => {
    const goals = [makeGoal(), makeGoal({ id: 'g2', title: 'Second goal' })]
    render(<GoalsView {...defaultProps()} goals={goals} />)
    expect(screen.getByText('2 goals')).toBeInTheDocument()
  })

  it('shows singular "1 goal" when only one goal', () => {
    render(<GoalsView {...defaultProps()} goals={[makeGoal()]} />)
    expect(screen.getByText('1 goal')).toBeInTheDocument()
  })

  it('calls onNewGoal when "New goal" button is clicked', async () => {
    const props = defaultProps()
    render(<GoalsView {...props} goals={[makeGoal()]} />)
    await userEvent.click(screen.getByRole('button', { name: /new goal/i }))
    expect(props.onNewGoal).toHaveBeenCalledOnce()
  })

  it('renders a task-type goal card with the goal title', () => {
    render(<GoalsView {...defaultProps()} goals={[makeGoal({ title: 'Learn Spanish' })]} />)
    expect(screen.getByText('Learn Spanish')).toBeInTheDocument()
  })

  it('calls onEditGoal when the edit button is clicked', async () => {
    const props = defaultProps()
    const goal = makeGoal()
    render(<GoalsView {...props} goals={[goal]} />)
    await userEvent.click(screen.getByRole('button', { name: /edit goal/i }))
    expect(props.onEditGoal).toHaveBeenCalledWith(goal)
  })

  it('renders a metric-type goal card with the goal title', () => {
    const goal = makeGoal({ goalType: 'metric', title: 'Save ₹50,000', startValue: 0, targetValue: 50000, unit: '₹' })
    render(<GoalsView {...defaultProps()} goals={[goal]} />)
    expect(screen.getByText('Save ₹50,000')).toBeInTheDocument()
  })

  it('shows "Log progress" button for metric goals', () => {
    const goal = makeGoal({ goalType: 'metric', startValue: 0, targetValue: 100, unit: 'km' })
    render(<GoalsView {...defaultProps()} goals={[goal]} />)
    expect(screen.getByRole('button', { name: /log progress/i })).toBeInTheDocument()
  })

  it('calls onLogProgress when "Log progress" is clicked', async () => {
    const props = defaultProps()
    const goal = makeGoal({ goalType: 'metric', startValue: 0, targetValue: 100 })
    render(<GoalsView {...props} goals={[goal]} />)
    await userEvent.click(screen.getByRole('button', { name: /log progress/i }))
    expect(props.onLogProgress).toHaveBeenCalledWith(goal)
  })

  it('shows "No tasks linked yet" message for task goal with no linked tasks', () => {
    render(<GoalsView {...defaultProps()} goals={[makeGoal()]} tasks={[]} />)
    expect(screen.getByText(/no tasks linked yet/i)).toBeInTheDocument()
  })

  it('shows linked task count and expands task list on click', async () => {
    const goal = makeGoal({ id: 'g1' })
    const task = makeTask({ goalId: 'g1', title: 'First step' })
    render(<GoalsView {...defaultProps()} goals={[goal]} tasks={[task]} />)
    const toggle = screen.getByRole('button', { name: /1 linked task/i })
    expect(toggle).toBeInTheDocument()
    await userEvent.click(toggle)
    expect(screen.getByText('First step')).toBeInTheDocument()
  })

  it('shows "No data yet" status badge for metric goal with no entries', () => {
    const goal = makeGoal({ goalType: 'metric', startValue: 0, targetValue: 100 })
    render(<GoalsView {...defaultProps()} goals={[goal]} />)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
  })

  it('shows history toggle for metric goal with entries', async () => {
    const goal = makeGoal({ id: 'g1', goalType: 'metric', startValue: 0, targetValue: 100, unit: 'km' })
    const entry: GoalProgressEntry = { id: 'e1', goalId: 'g1', value: 40, loggedAt: new Date().toISOString() }
    render(<GoalsView {...defaultProps()} goals={[goal]} entries={[entry]} />)
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument()
  })
})
