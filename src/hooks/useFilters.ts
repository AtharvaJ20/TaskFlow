import { useState, useCallback } from 'react'
import { parseISO, isToday, isPast, startOfDay, endOfDay, addDays } from 'date-fns'
import type { Filter, SortBy, Task, Priority, DueDateFilter } from '../types/task'

export interface UseFiltersReturn {
  filter: Filter
  setFilter: (f: Filter) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  search: string
  setSearch: (s: string) => void
  tagFilter: string | null
  setTagFilter: (tag: string | null) => void
  dueDateFilter: DueDateFilter
  setDueDateFilter: (f: DueDateFilter) => void
  priorityFilter: Priority | 'any'
  setPriorityFilter: (p: Priority | 'any') => void
  activeFilterCount: number
  clearAdvancedFilters: () => void
  applyFilters: (tasks: Task[]) => Task[]
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function useFilters(): UseFiltersReturn {
  const [filter, setFilter] = useState<Filter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('any')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'any'>('any')

  const activeFilterCount =
    (dueDateFilter !== 'any' ? 1 : 0) +
    (priorityFilter !== 'any' ? 1 : 0) +
    (tagFilter !== null ? 1 : 0)

  const clearAdvancedFilters = useCallback(() => {
    setDueDateFilter('any')
    setPriorityFilter('any')
    setTagFilter(null)
  }, [])

  const applyFilters = useCallback(
    (tasks: Task[]): Task[] => {
      // 1. Completion status
      let result = tasks.filter((task) => {
        if (filter === 'active') return !task.completed
        if (filter === 'completed') return task.completed
        return true
      })

      // 2. Tag filter
      if (tagFilter !== null) {
        result = result.filter((task) => task.tags.includes(tagFilter))
      }

      // 3. Priority filter
      if (priorityFilter !== 'any') {
        result = result.filter((task) => task.priority === priorityFilter)
      }

      // 4. Due date filter
      if (dueDateFilter !== 'any') {
        const now = new Date()
        const todayStart = startOfDay(now)
        const weekEnd = endOfDay(addDays(todayStart, 6))

        result = result.filter((task) => {
          if (dueDateFilter === 'no-date') return !task.dueDate
          if (!task.dueDate) return false
          const due = parseISO(task.dueDate)
          if (dueDateFilter === 'today') return isToday(due)
          if (dueDateFilter === 'this-week') return due >= todayStart && due <= weekEnd
          if (dueDateFilter === 'overdue') return isPast(due) && !isToday(due) && !task.completed
          return true
        })
      }

      // 5. Text search
      const query = search.trim().toLowerCase()
      if (query !== '') {
        result = result.filter((task) => {
          if (task.title.toLowerCase().includes(query)) return true
          if (task.description?.toLowerCase().includes(query)) return true
          if (task.tags.some((tag) => tag.toLowerCase().includes(query))) return true
          return false
        })
      }

      // 6. Sort (pinned always first)
      result = [...result].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        if (sortBy === 'createdAt') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortBy === 'dueDate') {
          const aHas = a.dueDate != null
          const bHas = b.dueDate != null
          if (aHas && bHas) return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
          if (aHas) return -1
          if (bHas) return 1
          return 0
        }
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      })

      return result
    },
    [filter, sortBy, search, tagFilter, dueDateFilter, priorityFilter],
  )

  return {
    filter, setFilter,
    sortBy, setSortBy,
    search, setSearch,
    tagFilter, setTagFilter,
    dueDateFilter, setDueDateFilter,
    priorityFilter, setPriorityFilter,
    activeFilterCount,
    clearAdvancedFilters,
    applyFilters,
  }
}
