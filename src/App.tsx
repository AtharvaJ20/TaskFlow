import { useState, useMemo, useCallback } from 'react'
import { useTasks } from './hooks/useTasks'
import { useTheme } from './hooks/useTheme'
import { useFilters } from './hooks/useFilters'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import TaskInput from './components/TaskInput'
import Toolbar from './components/Toolbar'
import TaskList from './components/TaskList'
import TaskModal from './components/TaskModal'
import Snackbar from './components/Snackbar'
import BulkActionBar from './components/BulkActionBar'
import CalendarView from './components/CalendarView'
import StatsModal from './components/StatsModal'
import FocusMode from './components/FocusMode'
import WelcomeTour from './components/WelcomeTour'
import AuthScreen from './components/AuthScreen'
import { useTour } from './hooks/useTour'
import { useNotifications } from './hooks/useNotifications'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAccentColor, ACCENT_OPTIONS } from './hooks/useAccentColor'
import type { AccentColor } from './hooks/useAccentColor'
import { useLists, LIST_COLORS } from './hooks/useLists'
import { exportJSON, exportCSV } from './utils/exportTasks'
import { importFromJSON, importFromCSV } from './utils/importTasks'
import SoundSettingsPanel from './components/SoundSettingsPanel'
import { type SoundSettings, loadSoundSettingsFull, saveSoundSettings } from './utils/soundSettings'
import type { Task, Filter } from './types/task'

const FILTER_TABS: { value: Filter; label: string; icon: string }[] = [
  { value: 'all', label: 'All Tasks', icon: 'M3 7h18M3 12h18M3 17h18' },
  { value: 'active', label: 'Active', icon: 'M9 12l2 2 4-4M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0' },
  { value: 'completed', label: 'Completed', icon: 'M5 13l4 4L19 7' },
]

export default function App() {
  const { user, mode, authError, signIn, signUp, signOut, continueAsGuest } = useAuth()
  const userId = user?.id ?? null

  const { tasks, tasksLoading, addTask, updateTask, toggleTask, deleteTask, lastDeleted, undoDelete, clearUndo, addSubtask, toggleSubtask, deleteSubtask, reorderTasks, importTasks, logTime } = useTasks(mode === 'user' ? userId : null)
  const { isDark, toggleTheme } = useTheme()
  const { accent, setAccent } = useAccentColor()
  const { lists, addList, deleteList } = useLists(mode === 'user' ? userId : null)
  const { filter, setFilter, sortBy, setSortBy, search, setSearch, tagFilter, setTagFilter, dueDateFilter, setDueDateFilter, priorityFilter, setPriorityFilter, activeFilterCount, clearAdvancedFilters, applyFilters } = useFilters()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [creatingList, setCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0])
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const focusTask = useMemo(() => tasks.find(t => t.id === focusTaskId) ?? null, [tasks, focusTaskId])
  const [showStats, setShowStats] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSoundSettings, setShowSoundSettings] = useState(false)
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(loadSoundSettingsFull)
  const [soundSaveError, setSoundSaveError] = useState<string | null>(null)
  const { step: tourStep, next: tourNext, dismiss: tourDismiss } = useTour()

  function handleSoundChange(s: SoundSettings) {
    setSoundSettings(s)
    setSoundSaveError(null)
    if (!saveSoundSettings(s)) {
      setSoundSaveError("Couldn't save — device storage is full.")
    }
  }

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const bulkComplete = useCallback(() => {
    selectedIds.forEach(id => {
      const task = tasks.find(t => t.id === id)
      if (task && !task.completed) updateTask(id, { completed: true })
    })
    clearSelection()
  }, [selectedIds, tasks, updateTask, clearSelection])

  const bulkDelete = useCallback(() => {
    selectedIds.forEach(id => deleteTask(id))
    clearSelection()
  }, [selectedIds, deleteTask, clearSelection])

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId])

  const listScopedTasks = useMemo(() => {
    if (activeListId === null) return tasks
    if (activeListId === 'inbox') return tasks.filter(t => !t.listId)
    return tasks.filter(t => t.listId === activeListId)
  }, [tasks, activeListId])

  const filteredTasks = useMemo(() => applyFilters(listScopedTasks), [applyFilters, listScopedTasks])

  const taskCounts = useMemo(() => ({
    all:       listScopedTasks.length,
    active:    listScopedTasks.filter(t => !t.completed).length,
    completed: listScopedTasks.filter(t => t.completed).length,
  }), [listScopedTasks])

  const listTaskCounts = useMemo(() => {
    const counts: Record<string, number> = { inbox: tasks.filter(t => !t.listId).length }
    lists.forEach(l => { counts[l.id] = tasks.filter(t => t.listId === l.id).length })
    return counts
  }, [tasks, lists])

  const pct = listScopedTasks.length > 0 ? Math.round((taskCounts.completed / listScopedTasks.length) * 100) : 0

  function handleCreateList() {
    const name = newListName.trim()
    if (!name) return
    addList(name, newListColor)
    setNewListName('')
    setNewListColor(LIST_COLORS[0])
    setCreatingList(false)
  }

  useNotifications(tasks)
  useKeyboardShortcuts({
    onEscape: () => { setSelectedTaskId(null); setSearch(''); setShowStats(false); setFocusTaskId(null) },
  })

  const handleReorder = useCallback((fromId: string, toId: string) => {
    const fromIndex = tasks.findIndex(t => t.id === fromId)
    const toIndex = tasks.findIndex(t => t.id === toId)
    if (fromIndex !== -1 && toIndex !== -1) reorderTasks(fromIndex, toIndex)
  }, [tasks, reorderTasks])

  const handleImportFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const tasks = file.name.endsWith('.csv')
          ? importFromCSV(text)
          : importFromJSON(text)
        importTasks(tasks)
      } catch (err) {
        alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    reader.readAsText(file)
  }, [importTasks])

  const handleDeleteFromModal = useCallback((id: string) => {
    deleteTask(id)
    setSelectedTaskId(null)
  }, [deleteTask])

  const filterLabel = FILTER_TABS.find(t => t.value === filter)?.label ?? 'Tasks'

  // Show auth screen when not yet signed in and not using guest mode
  if (mode === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent-500 border-t-transparent animate-spin" aria-label="Loading" />
      </div>
    )
  }

  if (mode === 'auth') {
    return (
      <AuthScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onGuest={continueAsGuest}
        error={authError}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-20">

        {/* Brand + theme toggle */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-500 flex-shrink-0" />
            <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">TaskFlow</span>
          </div>
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Progress stats */}
        <div className="px-6 py-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Progress</p>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{pct}%</span>
            <span className="text-sm text-gray-400 dark:text-gray-500 mb-1">{taskCounts.completed}/{tasks.length}</span>
          </div>
          <div
            className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${taskCounts.completed} of ${tasks.length} tasks completed`}
          >
            <div
              className="h-full bg-accent-500 rounded-full motion-safe:transition-all motion-safe:duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{taskCounts.active} active · {taskCounts.completed} done</p>
        </div>

        {/* Filter nav */}
        <nav className="px-3 py-4 flex-1" aria-label="Task filters">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">View</p>
          {FILTER_TABS.map(({ value, label, icon }) => {
            const isActive = filter === value
            const count = taskCounts[value]
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                  isActive
                    ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                    <path d={icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${
                  isActive
                    ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-600 dark:text-accent-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Lists section */}
        <div className="px-3 border-t border-gray-100 dark:border-gray-800 py-3">
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lists</p>
            <button
              type="button"
              onClick={() => setCreatingList(true)}
              aria-label="Create new list"
              className="text-gray-400 hover:text-accent-500 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 rounded"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* All lists */}
          <button
            type="button"
            onClick={() => setActiveListId(null)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
              activeListId === null
                ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              All lists
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{tasks.length}</span>
          </button>

          {/* Inbox */}
          <button
            type="button"
            onClick={() => setActiveListId('inbox')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
              activeListId === 'inbox'
                ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true">
                <path d="M2 10h4l1.5 2h5L14 10V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              Inbox
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{listTaskCounts.inbox}</span>
          </button>

          {/* User lists */}
          {lists.map(list => (
            <div key={list.id} className="flex items-center group/list">
              <button
                type="button"
                onClick={() => setActiveListId(list.id)}
                className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                  activeListId === list.id
                    ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} aria-hidden="true" />
                  {list.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{listTaskCounts[list.id] ?? 0}</span>
              </button>
              <button
                type="button"
                onClick={() => { if (activeListId === list.id) setActiveListId(null); deleteList(list.id) }}
                aria-label={`Delete list ${list.name}`}
                className="opacity-0 group-hover/list:opacity-100 transition-opacity text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 pr-1 focus:outline-none focus:opacity-100 flex-shrink-0"
              >
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true">
                  <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}

          {/* Inline new list form */}
          {creatingList && (
            <div className="mt-1 px-2">
              <div className="flex gap-1 mb-1.5">
                {LIST_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewListColor(c)}
                    aria-label={`Select color ${c}`}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded-full flex-shrink-0 transition-transform focus:outline-none ${newListColor === c ? 'scale-125 ring-1 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                  />
                ))}
              </div>
              <input
                autoFocus
                type="text"
                placeholder="List name…"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateList()
                  if (e.key === 'Escape') { setCreatingList(false); setNewListName('') }
                }}
                onBlur={() => { if (!newListName.trim()) { setCreatingList(false) } }}
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-accent-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
          )}
        </div>

        {/* Accent color picker */}
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5 px-1">Accent color</p>
          <div className="flex items-center gap-2 px-1 flex-wrap">
            {(Object.entries(ACCENT_OPTIONS) as [AccentColor, typeof ACCENT_OPTIONS[AccentColor]][]).map(([key, opt]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAccent(key)}
                aria-label={`Set accent color to ${opt.label}`}
                aria-pressed={accent === key}
                style={{ backgroundColor: opt.hex }}
                className={`w-6 h-6 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 ${
                  accent === key ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'
                }`}
                title={opt.label}
              />
            ))}
          </div>
        </div>

        {/* Alert sound settings */}
        <div className="px-3 pb-2 border-t border-gray-100 dark:border-gray-800 pt-3">
          <button
            type="button"
            onClick={() => setShowSoundSettings(v => !v)}
            aria-expanded={showSoundSettings}
            aria-label="Alert Sound settings"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <span className="flex items-center gap-2.5" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Alert Sound
            </span>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className={`w-3.5 h-3.5 transition-transform ${showSoundSettings ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showSoundSettings && (
            <div className="px-3 pt-2 pb-1">
              <SoundSettingsPanel
                settings={soundSettings}
                onChange={handleSoundChange}
                saveError={soundSaveError}
              />
            </div>
          )}
        </div>

        {/* Stats button */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setShowStats(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
              <path d="M3 17l5-5 4 4 5-6 4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Statistics
          </button>
        </div>

        {/* Account section */}
        <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
          {mode === 'user' && user ? (
            <div className="flex items-center gap-2 px-3">
              <div className="w-7 h-7 rounded-full bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-accent-700 dark:text-accent-300">{user.email?.[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{user.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">synced</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
                className="text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
                  <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-gray-400" aria-hidden="true">
                  <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2.5 13.5a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">Guest mode</p>
              <button
                type="button"
                onClick={signOut}
                className="text-xs text-accent-600 dark:text-accent-400 hover:underline focus:outline-none"
              >
                Sign in
              </button>
            </div>
          )}
        </div>

        {/* Active tag filter */}
        {tagFilter !== null && (
          <div className="px-4 pb-5 flex-shrink-0">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Tag filter</p>
            <span className="inline-flex items-center gap-1.5 bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-medium px-3 py-1.5 rounded-full">
              #{tagFilter}
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                aria-label={`Clear tag filter: ${tagFilter}`}
                className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors focus:outline-none"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M7.5 2.5L2.5 7.5M2.5 2.5l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          </div>
        )}
      </aside>

      {/* ── Page content (offset by sidebar on desktop) ──────────── */}
      <div className="lg:pl-64">

        {/* Mobile header — hidden on desktop */}
        <div className="lg:hidden">
          <Header
            totalCount={tasks.length}
            completedCount={taskCounts.completed}
            activeCount={taskCounts.active}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
        </div>

        {/* Desktop top bar — hidden on mobile */}
        <div className="hidden lg:flex items-center h-14 px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{filterLabel}</h1>
          {tagFilter && (
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">· #{tagFilter}</span>
          )}
        </div>

        {/* Main content */}
        <main className="px-4 py-5 lg:px-8 lg:py-7 max-w-3xl lg:max-w-none">
          <div className="flex flex-col gap-4">
            <TaskInput onAdd={addTask} lists={lists} activeListId={activeListId} />

            <Toolbar
              filter={filter}
              onFilterChange={setFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              search={search}
              onSearchChange={setSearch}
              taskCounts={taskCounts}
              tagFilter={tagFilter}
              onClearTagFilter={() => setTagFilter(null)}
              onExportJSON={() => exportJSON(tasks)}
              onExportCSV={() => exportCSV(tasks)}
              onImportFile={handleImportFile}
              view={view}
              onViewChange={setView}
              dueDateFilter={dueDateFilter}
              onDueDateFilterChange={setDueDateFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              activeFilterCount={activeFilterCount}
              onClearAdvancedFilters={clearAdvancedFilters}
            />

            {tasksLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 rounded-full border-2 border-accent-500 border-t-transparent animate-spin" aria-label="Loading tasks" />
              </div>
            ) : view === 'calendar' ? (
              <CalendarView
                tasks={tasks}
                onOpenModal={(task: Task) => setSelectedTaskId(task.id)}
              />
            ) : (
              <TaskList
                tasks={filteredTasks}
                filter={filter}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onUpdate={updateTask}
                onOpenModal={(task: Task) => setSelectedTaskId(task.id)}
                onTagClick={setTagFilter}
                selectedIds={selectedIds}
                onSelect={toggleSelection}
                onReorder={handleReorder}
                lists={lists}
                showList={activeListId === null}
                onFocus={(task) => setFocusTaskId(task.id)}
              />
            )}
          </div>
        </main>
      </div>

      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={updateTask}
        onDelete={handleDeleteFromModal}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={deleteSubtask}
        lists={lists}
      />

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onCompleteAll={bulkComplete}
          onDeleteAll={bulkDelete}
          onClear={clearSelection}
        />
      )}

      {showStats && (
        <StatsModal tasks={tasks} onClose={() => setShowStats(false)} />
      )}

      {focusTask && (
        <FocusMode
          task={focusTask}
          onClose={() => setFocusTaskId(null)}
          onComplete={(id) => { toggleTask(id); setFocusTaskId(null) }}
          onToggleSubtask={toggleSubtask}
          onLogTime={logTime}
        />
      )}

      {/* Onboarding tour */}
      {tourStep !== null && (
        <WelcomeTour
          step={tourStep}
          onNext={() => tourNext(5)}
          onSkip={tourDismiss}
        />
      )}

      {/* Mobile sidebar drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-gray-900 h-full flex flex-col overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-500" />
                <span className="text-base font-bold text-gray-900 dark:text-white">TaskFlow</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Progress */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{pct}%</span>
                <span className="text-sm text-gray-400 mb-0.5">{taskCounts.completed}/{tasks.length}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-accent-500 rounded-full motion-safe:transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{taskCounts.active} active · {taskCounts.completed} done</p>
            </div>

            {/* Filter nav */}
            <nav className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-1.5">View</p>
              {FILTER_TABS.map(({ value, label, icon }) => {
                const isActive = filter === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setFilter(value); setMobileMenuOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors focus:outline-none ${
                      isActive
                        ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                        <path d={icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-600 dark:text-accent-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                      {taskCounts[value]}
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* Lists */}
            <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 flex-1">
              <div className="flex items-center justify-between px-3 mb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lists</p>
                <button type="button" onClick={() => setCreatingList(true)} aria-label="Create new list" className="text-gray-400 hover:text-accent-500 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 rounded">
                  <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </button>
              </div>
              {[
                { id: null as null, label: 'All lists', count: tasks.length, icon: 'M2 4h12M2 8h12M2 12h12' },
                { id: 'inbox' as string, label: 'Inbox', count: listTaskCounts.inbox, icon: 'M2 10h4l1.5 2h5L14 10V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6z' },
              ].map(item => (
                <button
                  key={String(item.id)}
                  type="button"
                  onClick={() => { setActiveListId(item.id); setMobileMenuOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors focus:outline-none ${activeListId === item.id ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <span className="flex items-center gap-2">
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true"><path d={item.icon} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" /></svg>
                    {item.label}
                  </span>
                  <span className="text-xs text-gray-400">{item.count}</span>
                </button>
              ))}
              {lists.map(list => (
                <div key={list.id} className="flex items-center group/list">
                  <button type="button" onClick={() => { setActiveListId(list.id); setMobileMenuOpen(false) }} className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors focus:outline-none ${activeListId === list.id ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} aria-hidden="true" />
                      {list.name}
                    </span>
                    <span className="text-xs text-gray-400">{listTaskCounts[list.id] ?? 0}</span>
                  </button>
                  <button type="button" onClick={() => { if (activeListId === list.id) setActiveListId(null); deleteList(list.id) }} aria-label={`Delete list ${list.name}`} className="opacity-0 group-hover/list:opacity-100 transition-opacity text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 pr-1 focus:outline-none focus:opacity-100 flex-shrink-0">
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ))}
              {creatingList && (
                <div className="mt-1 px-2">
                  <div className="flex gap-1 mb-1.5">
                    {LIST_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setNewListColor(c)} style={{ backgroundColor: c }} className={`w-4 h-4 rounded-full flex-shrink-0 transition-transform focus:outline-none ${newListColor === c ? 'scale-125 ring-1 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`} />
                    ))}
                  </div>
                  <input autoFocus type="text" placeholder="List name…" value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateList(); if (e.key === 'Escape') { setCreatingList(false); setNewListName('') } }} onBlur={() => { if (!newListName.trim()) setCreatingList(false) }} className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-accent-500 text-gray-800 dark:text-gray-200 placeholder-gray-400" />
                </div>
              )}
            </div>

            {/* Accent color */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Accent color</p>
              <div className="flex items-center gap-2 flex-wrap">
                {(Object.entries(ACCENT_OPTIONS) as [AccentColor, typeof ACCENT_OPTIONS[AccentColor]][]).map(([key, opt]) => (
                  <button key={key} type="button" onClick={() => setAccent(key)} aria-label={`Set accent color to ${opt.label}`} aria-pressed={accent === key} style={{ backgroundColor: opt.hex }} className={`w-6 h-6 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 ${accent === key ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`} title={opt.label} />
                ))}
              </div>
            </div>

            {/* Alert sound settings */}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowSoundSettings(v => !v)}
                aria-expanded={showSoundSettings}
                aria-label="Alert Sound settings"
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none"
              >
                <span className="flex items-center gap-2.5" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Alert Sound
                </span>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`w-3.5 h-3.5 transition-transform ${showSoundSettings ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {showSoundSettings && (
                <div className="px-3 pt-2 pb-1">
                  <SoundSettingsPanel
                    settings={soundSettings}
                    onChange={handleSoundChange}
                    saveError={soundSaveError}
                  />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="px-3 py-2">
              <button type="button" onClick={() => { setShowStats(true); setMobileMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M3 17l5-5 4 4 5-6 4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Statistics
              </button>
            </div>

            {/* Account */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
              {mode === 'user' && user ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-accent-700 dark:text-accent-300">{user.email?.[0].toUpperCase()}</span>
                  </div>
                  <p className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate">{user.email}</p>
                  <button type="button" onClick={() => { signOut(); setMobileMenuOpen(false) }} className="text-xs text-red-500 hover:underline focus:outline-none">Sign out</button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">Guest mode</p>
                  <button type="button" onClick={() => { signOut(); setMobileMenuOpen(false) }} className="text-xs text-accent-600 dark:text-accent-400 hover:underline focus:outline-none">Sign in</button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {lastDeleted && (
        <Snackbar
          key={lastDeleted.task.id}
          message={`"${lastDeleted.task.title}" deleted`}
          actionLabel="Undo"
          onAction={undoDelete}
          onDismiss={clearUndo}
        />
      )}
    </div>
  )
}
