import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Toolbar from '../../components/Toolbar'
import type { Filter, SortBy, DueDateFilter, Priority } from '../../types/task'

function defaultProps() {
  return {
    filter: 'all' as Filter,
    onFilterChange: vi.fn(),
    sortBy: 'createdAt' as SortBy,
    onSortChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    taskCounts: { all: 5, active: 3, completed: 2 },
    tagFilter: null,
    onClearTagFilter: vi.fn(),
    onExportJSON: vi.fn(),
    onExportCSV: vi.fn(),
    onImportFile: vi.fn(),
    view: 'list' as 'list' | 'calendar',
    onViewChange: vi.fn(),
    dueDateFilter: 'any' as DueDateFilter,
    onDueDateFilterChange: vi.fn(),
    priorityFilter: 'any' as Priority | 'any',
    onPriorityFilterChange: vi.fn(),
    activeFilterCount: 0,
    onClearAdvancedFilters: vi.fn(),
  }
}

describe('Toolbar – structure', () => {
  it('renders the search input', () => {
    render(<Toolbar {...defaultProps()} />)
    expect(screen.getByRole('searchbox', { name: /search tasks/i })).toBeInTheDocument()
  })

  it('renders the sort dropdown', () => {
    render(<Toolbar {...defaultProps()} />)
    expect(screen.getByRole('combobox', { name: /sort tasks/i })).toBeInTheDocument()
  })

  it('renders List and Calendar view toggle buttons', () => {
    render(<Toolbar {...defaultProps()} />)
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /calendar view/i })).toBeInTheDocument()
  })

  it('renders Export and Import buttons', () => {
    render(<Toolbar {...defaultProps()} />)
    expect(screen.getByRole('button', { name: /export tasks/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import tasks/i })).toBeInTheDocument()
  })

  it('renders Advanced filters toggle button', () => {
    render(<Toolbar {...defaultProps()} />)
    expect(screen.getByRole('button', { name: /advanced filters/i })).toBeInTheDocument()
  })

  it('renders filter tabs with task counts', () => {
    render(<Toolbar {...defaultProps()} />)
    // Count is concatenated directly: "All5", "Active3", "Completed2" — use prefix regex
    expect(screen.getByRole('button', { name: /^all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^active/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^completed/i })).toBeInTheDocument()
  })
})

describe('Toolbar – filter tabs', () => {
  it('calls onFilterChange with "active" when Active tab clicked', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^active/i }))
    expect(props.onFilterChange).toHaveBeenCalledWith('active')
  })

  it('calls onFilterChange with "completed" when Completed tab clicked', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^completed/i }))
    expect(props.onFilterChange).toHaveBeenCalledWith('completed')
  })
})

describe('Toolbar – search and sort', () => {
  it('calls onSearchChange when typing in search', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.type(screen.getByRole('searchbox', { name: /search tasks/i }), 'buy')
    expect(props.onSearchChange).toHaveBeenCalled()
  })

  it('calls onSortChange when a different sort option is selected', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort tasks/i }), 'priority')
    expect(props.onSortChange).toHaveBeenCalledWith('priority')
  })
})

describe('Toolbar – export dropdown', () => {
  it('opens the export menu on Export button click', async () => {
    render(<Toolbar {...defaultProps()} />)
    await userEvent.click(screen.getByRole('button', { name: /export tasks/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'JSON' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument()
  })

  it('calls onExportJSON and closes menu when JSON is clicked', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /export tasks/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'JSON' }))
    expect(props.onExportJSON).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls onExportCSV and closes menu when CSV is clicked', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /export tasks/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'CSV' }))
    expect(props.onExportCSV).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('Toolbar – view toggle', () => {
  it('calls onViewChange with "calendar" when Calendar view is clicked', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /calendar view/i }))
    expect(props.onViewChange).toHaveBeenCalledWith('calendar')
  })

  it('calls onViewChange with "list" when List view is clicked', async () => {
    const props = { ...defaultProps(), view: 'calendar' as const }
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /list view/i }))
    expect(props.onViewChange).toHaveBeenCalledWith('list')
  })
})

describe('Toolbar – advanced filters', () => {
  it('opens the filter panel when Filter button is clicked', async () => {
    render(<Toolbar {...defaultProps()} />)
    await userEvent.click(screen.getByRole('button', { name: /advanced filters/i }))
    // Due date and priority filter options should be visible
    expect(screen.getByRole('button', { name: /due today/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^high$/i })).toBeInTheDocument()
  })

  it('calls onDueDateFilterChange when a due date filter is clicked', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /advanced filters/i }))
    await userEvent.click(screen.getByRole('button', { name: /overdue/i }))
    expect(props.onDueDateFilterChange).toHaveBeenCalledWith('overdue')
  })

  it('calls onPriorityFilterChange when a priority filter is clicked', async () => {
    const props = defaultProps()
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /advanced filters/i }))
    await userEvent.click(screen.getByRole('button', { name: /^high$/i }))
    expect(props.onPriorityFilterChange).toHaveBeenCalledWith('high')
  })

  it('shows "Clear all filters" when activeFilterCount > 0 and panel is open', async () => {
    const props = { ...defaultProps(), activeFilterCount: 2 }
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /advanced filters/i }))
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument()
  })

  it('calls onClearAdvancedFilters when "Clear all filters" is clicked', async () => {
    const props = { ...defaultProps(), activeFilterCount: 1 }
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /advanced filters/i }))
    await userEvent.click(screen.getByRole('button', { name: /clear all filters/i }))
    expect(props.onClearAdvancedFilters).toHaveBeenCalledOnce()
  })
})

describe('Toolbar – active filter chips', () => {
  it('shows a tag filter chip when tagFilter is set', () => {
    const props = { ...defaultProps(), tagFilter: 'work' }
    render(<Toolbar {...props} />)
    expect(screen.getByText('#work')).toBeInTheDocument()
  })

  it('calls onClearTagFilter when the tag chip × is clicked', async () => {
    const props = { ...defaultProps(), tagFilter: 'urgent' }
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /clear tag filter: urgent/i }))
    expect(props.onClearTagFilter).toHaveBeenCalledOnce()
  })

  it('shows due date chip when a due date filter is active and panel is closed', () => {
    const props = { ...defaultProps(), dueDateFilter: 'today' as DueDateFilter }
    render(<Toolbar {...props} />)
    expect(screen.getByText('Due today')).toBeInTheDocument()
  })

  it('calls onDueDateFilterChange("any") when date chip × is clicked', async () => {
    const props = { ...defaultProps(), dueDateFilter: 'today' as DueDateFilter }
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /clear date filter/i }))
    expect(props.onDueDateFilterChange).toHaveBeenCalledWith('any')
  })

  it('shows priority chip when a priority filter is active and panel is closed', () => {
    const props = { ...defaultProps(), priorityFilter: 'high' as Priority }
    render(<Toolbar {...props} />)
    expect(screen.getByText('high priority')).toBeInTheDocument()
  })

  it('calls onPriorityFilterChange("any") when priority chip × is clicked', async () => {
    const props = { ...defaultProps(), priorityFilter: 'high' as Priority }
    render(<Toolbar {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /clear priority filter/i }))
    expect(props.onPriorityFilterChange).toHaveBeenCalledWith('any')
  })
})
