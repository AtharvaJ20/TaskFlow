import { useEffect, useRef, useState } from 'react'
import type { Task, Priority, RecurrenceFrequency, TaskList } from '../types/task'

interface TaskModalProps {
  task: Task | null
  onClose: () => void
  onUpdate: (id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  onDelete: (id: string) => void
  onAddSubtask: (taskId: string, title: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  lists: TaskList[]
}

function formatTimeLogged(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

export default function TaskModal({ task, onClose, onUpdate, onDelete, onAddSubtask, onToggleSubtask, onDeleteSubtask, lists }: TaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [subtaskInput, setSubtaskInput] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | 'none'>('none')
  const [customDays, setCustomDays] = useState<number[]>([])
  const [listId, setListId] = useState<string | undefined>(undefined)

  const titleRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setPriority(task.priority)
      setDueDate(task.dueDate ?? '')
      setTags([...task.tags])
      setTagInput('')
      setSubtaskInput('')
      setRecurrence(task.recurrence?.frequency ?? 'none')
      setCustomDays(task.recurrence?.customDays ?? [])
      setListId(task.listId)
    }
  }, [task])

  // Focus management: store trigger element on open, restore it on close
  useEffect(() => {
    if (!task) return
    previousFocusRef.current = document.activeElement as HTMLElement
    titleRef.current?.focus()
    return () => {
      const el = previousFocusRef.current
      setTimeout(() => el?.focus(), 0)
    }
  // task?.id intentional: only re-run when a different task is opened, not on every field edit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  // Escape closes + focus trap — only when modal is open
  useEffect(() => {
    if (!task) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const el = dialogRef.current
      if (!el) return
      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute('disabled'))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [task, onClose])

  if (!task) return null

  function handleSave() {
    if (!task) return

    const changes: Partial<Omit<Task, 'id' | 'createdAt'>> = {}

    if (title !== task.title) changes.title = title
    if (description !== (task.description ?? '')) changes.description = description || undefined
    if (priority !== task.priority) changes.priority = priority
    if (dueDate !== (task.dueDate ?? '')) changes.dueDate = dueDate || undefined
    if (JSON.stringify(tags) !== JSON.stringify(task.tags)) changes.tags = tags
    const newRecurrence =
      recurrence !== 'none'
        ? {
            frequency: recurrence,
            interval: 1,
            ...(recurrence === 'custom' && customDays.length > 0
              ? { customDays: [...customDays].sort((a, b) => a - b) }
              : {}),
          }
        : undefined
    if (JSON.stringify(newRecurrence) !== JSON.stringify(task.recurrence)) changes.recurrence = newRecurrence
    if (listId !== task.listId) changes.listId = listId

    onUpdate(task.id, changes)
    onClose()
  }

  function handleDelete() {
    if (!task) return
    onDelete(task.id)
    onClose()
  }

  function handleAddTag(value: string) {
    const trimmed = value.trim().replace(/,$/, '').trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
    }
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(tagInput)
    }
  }

  function handleTagInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (value.endsWith(',')) {
      handleAddTag(value)
    } else {
      setTagInput(value)
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const priorityOptions: { value: Priority; label: string; active: string; inactive: string }[] = [
    {
      value: 'low',
      label: 'Low',
      active: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
      inactive: 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    },
    {
      value: 'medium',
      label: 'Medium',
      active: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      inactive: 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    },
    {
      value: 'high',
      label: 'High',
      active: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      inactive: 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="task-modal-title" className="sr-only">Edit task</h2>
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500 min-w-0"
            placeholder="Task title"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Description */}
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 transition"
          />

          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20 flex-shrink-0">
              Priority
            </span>
            <div className="flex gap-2">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={priority === opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                    priority === opt.value ? opt.active : opt.inactive
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20 flex-shrink-0">
              Due date
            </span>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 transition"
            />
          </div>

          {/* Recurrence */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20 flex-shrink-0">
                Repeat
              </span>
              <select
                aria-label="Recurrence frequency"
                value={recurrence}
                onChange={e => {
                  const v = e.target.value as RecurrenceFrequency | 'none'
                  setRecurrence(v)
                  if (v !== 'custom') setCustomDays([])
                }}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 transition"
              >
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom days</option>
              </select>
            </div>
            {recurrence === 'custom' && (
              <div className="flex items-center gap-1.5 ml-[92px] flex-wrap">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={customDays.includes(i)}
                    aria-label={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]}
                    onClick={() => setCustomDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                    className={`w-8 h-8 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                      customDays.includes(i)
                        ? 'bg-accent-600 border-accent-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-accent-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          {lists.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20 flex-shrink-0">
                List
              </span>
              <div className="flex items-center gap-2">
                {listId && (() => { const l = lists.find(x => x.id === listId); return l ? <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} /> : null })()}
                <select
                  aria-label="Task list"
                  value={listId ?? ''}
                  onChange={e => setListId(e.target.value || undefined)}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-accent-500 transition"
                >
                  <option value="">Inbox</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex items-start gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20 flex-shrink-0 pt-1">
              Tags
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path
                        d="M7.5 2.5L2.5 7.5M2.5 2.5l5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag…"
                className="text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent outline-none min-w-20"
              />
            </div>
          </div>

          {/* Time logged */}
          {(task.timeLogged ?? 0) > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20 flex-shrink-0">
                Time logged
              </span>
              <span className="flex items-center gap-1.5 text-sm text-accent-600 dark:text-accent-400 font-medium">
                <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M7 4V7l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {formatTimeLogged(task.timeLogged!)}
              </span>
            </div>
          )}

          {/* Subtasks */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Subtasks
              </span>
              {(task.subtasks ?? []).length > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {(task.subtasks ?? []).filter(s => s.completed).length}/{(task.subtasks ?? []).length} done
                </span>
              )}
            </div>

            {(task.subtasks ?? []).length > 0 && (
              <ul className="flex flex-col gap-1">
                {(task.subtasks ?? []).map(subtask => (
                  <li key={subtask.id} className="flex items-center gap-2 group/sub">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={subtask.completed}
                      aria-label={subtask.completed ? `Mark subtask "${subtask.title}" incomplete` : `Mark subtask "${subtask.title}" complete`}
                      onClick={() => onToggleSubtask(task.id, subtask.id)}
                      className={`p-0 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        subtask.completed
                          ? 'bg-accent-600 border-accent-600'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {subtask.completed && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete subtask "${subtask.title}"`}
                      onClick={() => onDeleteSubtask(task.id, subtask.id)}
                      className="opacity-0 group-hover/sub:opacity-100 text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 transition-opacity focus:opacity-100 focus:outline-none"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={subtaskInput}
                onChange={e => setSubtaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const val = e.currentTarget.value
                    onAddSubtask(task.id, val)
                    setSubtaskInput('')
                    e.currentTarget.value = ''
                  }
                }}
                placeholder="Add a subtask…"
                aria-label="New subtask title"
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 border-b border-transparent focus:border-accent-400 transition-colors py-0.5"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-between items-center">
          <button
            type="button"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
