import { useRef, useState } from 'react'
import type { Filter, SortBy, DueDateFilter, Priority } from '../types/task'

interface ToolbarProps {
  filter: Filter
  onFilterChange: (f: Filter) => void
  sortBy: SortBy
  onSortChange: (s: SortBy) => void
  search: string
  onSearchChange: (s: string) => void
  taskCounts: { all: number; active: number; completed: number }
  tagFilter: string | null
  onClearTagFilter: () => void
  onExportJSON: () => void
  onExportCSV: () => void
  onImportFile: (file: File) => void
  view: 'list' | 'calendar'
  onViewChange: (v: 'list' | 'calendar') => void
  dueDateFilter: DueDateFilter
  onDueDateFilterChange: (f: DueDateFilter) => void
  priorityFilter: Priority | 'any'
  onPriorityFilterChange: (p: Priority | 'any') => void
  activeFilterCount: number
  onClearAdvancedFilters: () => void
}

const FILTER_TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'createdAt', label: 'Newest first' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
]

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: 'any',       label: 'Any date' },
  { value: 'today',     label: 'Due today' },
  { value: 'this-week', label: 'This week' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'no-date',   label: 'No date' },
]

const PRIORITY_OPTIONS: { value: Priority | 'any'; label: string }[] = [
  { value: 'any',    label: 'Any priority' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

export default function Toolbar({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  search,
  onSearchChange,
  taskCounts,
  tagFilter,
  onClearTagFilter,
  onExportJSON,
  onExportCSV,
  onImportFile,
  view,
  onViewChange,
  dueDateFilter,
  onDueDateFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  activeFilterCount,
  onClearAdvancedFilters,
}: ToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">

        {/* Filter tabs — hidden on lg+ where sidebar owns them */}
        <div className="flex items-center gap-1 lg:hidden">
          {FILTER_TABS.map(({ value, label }) => {
            const isActive = filter === value
            const count = taskCounts[value]
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onFilterChange(value)}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-lg',
                  isActive
                    ? 'bg-accent-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                ].join(' ')}
              >
                {label}
                <span
                  className={[
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Sort + search + filters + export + view toggle */}
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <select
            aria-label="Sort tasks by"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <div className="relative flex-1 sm:flex-none">
            <svg className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 4.5 4.5a7.5 7.5 0 0 0 12.15 12.15Z" />
            </svg>
            <input
              type="search"
              aria-label="Search tasks"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full sm:w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Advanced filter toggle */}
          <button
            type="button"
            aria-label="Advanced filters"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(o => !o)}
            className={`relative flex items-center gap-1 border rounded-lg px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
              filtersOpen || hasActiveFilters
                ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-300 dark:border-accent-600 text-accent-700 dark:text-accent-300'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:border-accent-400'
            }`}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-label="Export tasks"
              aria-expanded={exportOpen}
              aria-haspopup="menu"
              onClick={() => setExportOpen(o => !o)}
              className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-200 hover:border-accent-400 dark:hover:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
                <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>

            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setExportOpen(false)} />
                <div role="menu" className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[120px]">
                  <button role="menuitem" type="button" onClick={() => { onExportJSON(); setExportOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none">JSON</button>
                  <button role="menuitem" type="button" onClick={() => { onExportCSV(); setExportOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none">CSV</button>
                </div>
              </>
            )}
          </div>

          {/* Import */}
          <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" aria-hidden="true" onChange={(e) => { const file = e.target.files?.[0]; if (file) { onImportFile(file); e.target.value = '' } }} />
          <button type="button" aria-label="Import tasks" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-200 hover:border-accent-400 dark:hover:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
              <path d="M8 14V6M5 9l3-3 3 3M3 14h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => onViewChange('list')} className={`p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-500 ${view === 'list' ? 'bg-accent-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
            <button type="button" aria-label="Calendar view" aria-pressed={view === 'calendar'} onClick={() => onViewChange('calendar')} className={`p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-500 ${view === 'calendar' ? 'bg-accent-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
                <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5 1.5v2M11 1.5v2M2 6h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <rect x="4" y="8.5" width="2" height="2" rx="0.5" fill="currentColor" />
                <rect x="7" y="8.5" width="2" height="2" rx="0.5" fill="currentColor" />
                <rect x="10" y="8.5" width="2" height="2" rx="0.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced filter panel */}
      {filtersOpen && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex flex-col gap-3">
          {/* Due date */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">Due date</span>
            <div className="flex gap-1 flex-wrap">
              {DUE_DATE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={dueDateFilter === value}
                  onClick={() => onDueDateFilterChange(value)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                    dueDateFilter === value
                      ? 'bg-accent-600 border-accent-600 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-accent-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">Priority</span>
            <div className="flex gap-1 flex-wrap">
              {PRIORITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={priorityFilter === value}
                  onClick={() => onPriorityFilterChange(value as Priority | 'any')}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                    priorityFilter === value
                      ? 'bg-accent-600 border-accent-600 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-accent-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAdvancedFilters}
              className="self-start text-xs text-accent-600 dark:text-accent-400 hover:underline focus:outline-none"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {(tagFilter !== null || (dueDateFilter !== 'any' && !filtersOpen) || (priorityFilter !== 'any' && !filtersOpen)) && (
        <div className="flex items-center gap-2 flex-wrap">
          {tagFilter !== null && (
            <span className="inline-flex items-center gap-1 bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-medium px-2 py-0.5 rounded-full">
              #{tagFilter}
              <button type="button" onClick={onClearTagFilter} aria-label={`Clear tag filter: ${tagFilter}`} className="hover:text-accent-900 dark:hover:text-accent-100 transition-colors focus:outline-none">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M7.5 2.5L2.5 7.5M2.5 2.5l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </span>
          )}
          {dueDateFilter !== 'any' && !filtersOpen && (
            <span className="inline-flex items-center gap-1 bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-medium px-2 py-0.5 rounded-full">
              {DUE_DATE_OPTIONS.find(o => o.value === dueDateFilter)?.label}
              <button type="button" onClick={() => onDueDateFilterChange('any')} aria-label="Clear date filter" className="hover:text-accent-900 dark:hover:text-accent-100 transition-colors focus:outline-none">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M7.5 2.5L2.5 7.5M2.5 2.5l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </span>
          )}
          {priorityFilter !== 'any' && !filtersOpen && (
            <span className="inline-flex items-center gap-1 bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-medium px-2 py-0.5 rounded-full">
              {priorityFilter} priority
              <button type="button" onClick={() => onPriorityFilterChange('any')} aria-label="Clear priority filter" className="hover:text-accent-900 dark:hover:text-accent-100 transition-colors focus:outline-none">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M7.5 2.5L2.5 7.5M2.5 2.5l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
