import React, { useState, useRef, useEffect, useCallback } from 'react'
import { format, isToday, isTomorrow, addDays } from 'date-fns'
import type { NewTaskInput, Priority, RecurrenceFrequency, TaskList, Goal } from '../types/task'

const REPEAT_OPTIONS: { value: RecurrenceFrequency | 'none'; label: string }[] = [
  { value: 'none',    label: 'No repeat' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom',  label: 'Custom' },
]

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const DAY_FULL   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface TaskInputProps {
  onAdd: (input: NewTaskInput) => void
  lists: TaskList[]
  goals: Goal[]
  activeListId?: string | null
  activeGoalId?: string | null
}

const PRIORITY_CONFIG: { value: Priority; label: string; classes: string; selectedClasses: string }[] = [
  {
    value: 'low',
    label: 'Low',
    classes:
      'text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30',
    selectedClasses: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-400 dark:border-green-600',
  },
  {
    value: 'medium',
    label: 'Medium',
    classes:
      'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30',
    selectedClasses: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-600',
  },
  {
    value: 'high',
    label: 'High',
    classes:
      'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30',
    selectedClasses: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-400 dark:border-red-600',
  },
]

export default function TaskInput({ onAdd, lists, goals, activeListId, activeGoalId }: TaskInputProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [listId, setListId] = useState<string | undefined>(
    activeListId && activeListId !== 'inbox' && activeListId !== null ? activeListId : undefined
  )
  const [goalId, setGoalId] = useState<string | undefined>(
    activeGoalId ?? undefined
  )
  const [repeatFreq, setRepeatFreq] = useState<RecurrenceFrequency | 'none'>('none')
  const [customDays, setCustomDays] = useState<number[]>([])
  const [showRepeatPanel, setShowRepeatPanel] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep listId in sync when active list changes externally
  useEffect(() => {
    if (activeListId && activeListId !== 'inbox') {
      setListId(activeListId)
    } else {
      setListId(undefined)
    }
  }, [activeListId])

  // Keep goalId in sync when active goal changes externally
  useEffect(() => {
    setGoalId(activeGoalId ?? undefined)
  }, [activeGoalId])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()
      const isEditable =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable

      if (!isEditable && e.key === 'n') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const addTag = useCallback((raw: string) => {
    const trimmed = raw.trim().replace(/,+$/, '').trim()
    if (!trimmed || tags.includes(trimmed) || tags.length >= 5) return
    setTags((prev) => [...prev, trimmed])
  }, [tags])

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    }
  }

  function handleTagInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (value.endsWith(',')) {
      addTag(value)
      setTagInput('')
    } else {
      setTagInput(value)
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function repeatChipLabel(): string {
    if (repeatFreq === 'none') return 'No repeat'
    if (repeatFreq === 'daily')   return 'Daily'
    if (repeatFreq === 'weekly')  return 'Weekly'
    if (repeatFreq === 'monthly') return 'Monthly'
    if (repeatFreq === 'custom') {
      if (customDays.length === 0) return 'Custom'
      return [...customDays].sort((a, b) => a - b).map(d => DAY_LABELS[d]).join(', ')
    }
    return 'No repeat'
  }

  function toggleCustomDay(day: number) {
    setCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) return

    const recurrence =
      repeatFreq !== 'none'
        ? {
            frequency: repeatFreq,
            interval: 1,
            ...(repeatFreq === 'custom' && customDays.length > 0 ? { customDays: [...customDays].sort((a, b) => a - b) } : {}),
          }
        : undefined

    const input: NewTaskInput = {
      title: trimmed,
      priority,
      ...(dueDate ? { dueDate } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      ...(listId ? { listId } : {}),
      ...(recurrence ? { recurrence } : {}),
      ...(goalId ? { goalId } : {}),
    }
    onAdd(input)

    setTitle('')
    setPriority('medium')
    setDueDate('')
    setTags([])
    setTagInput('')
    setRepeatFreq('none')
    setCustomDays([])
    setShowRepeatPanel(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const selectedList = lists.find(l => l.id === listId)
  const selectedGoal = goals.find(g => g.id === goalId)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      {/* Row 1: text input + Add button */}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          aria-label="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          className="flex-1 outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-base"
        />
        <button
          onClick={handleSubmit}
          className="bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shrink-0"
        >
          Add
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-700 my-3" />

      {/* Row 2: priority selector + due date + list picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {PRIORITY_CONFIG.map(({ value, label, classes, selectedClasses }) => (
            <button
              key={value}
              type="button"
              aria-pressed={priority === value}
              onClick={() => setPriority(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                priority === value ? selectedClasses : classes
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick shortcuts */}
          <button
            type="button"
            onClick={() => setDueDate(format(new Date(), 'yyyy-MM-dd'))}
            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
              dueDate && isToday(new Date(dueDate + 'T00:00:00'))
                ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 border-accent-400'
                : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDueDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
              dueDate && isTomorrow(new Date(dueDate + 'T00:00:00'))
                ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 border-accent-400'
                : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Tomorrow
          </button>
          {/* Native date picker hidden behind icon button */}
          <label className={`relative flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
            dueDate && !isToday(new Date(dueDate + 'T00:00:00')) && !isTomorrow(new Date(dueDate + 'T00:00:00'))
              ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 border-accent-400'
              : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>
              {dueDate && !isToday(new Date(dueDate + 'T00:00:00')) && !isTomorrow(new Date(dueDate + 'T00:00:00'))
                ? format(new Date(dueDate + 'T00:00:00'), 'MMM d')
                : 'Pick'}
            </span>
            <input
              type="date"
              aria-label="Due date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </label>
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate('')}
              aria-label="Clear due date"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-base leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Repeat chip */}
        <button
          type="button"
          onClick={() => setShowRepeatPanel(v => !v)}
          aria-expanded={showRepeatPanel}
          aria-label="Set repeat schedule"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
            repeatFreq !== 'none'
              ? 'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 border-accent-400'
              : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 flex-shrink-0" aria-hidden="true">
            <path d="M2 7a5 5 0 0 1 9-3M12 7a5 5 0 0 1-9 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M10.5 3.5L11 1l1.5 2.5-2.5.5M3.5 10.5L3 13 1.5 10.5l2.5-.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {repeatChipLabel()}
        </button>

        {/* List picker */}
        {lists.length > 0 && (
          <select
            aria-label="Assign to list"
            value={listId ?? ''}
            onChange={(e) => setListId(e.target.value || undefined)}
            className="ml-auto text-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 outline-none focus:border-accent-400 transition-colors"
            style={selectedList ? { borderLeftColor: selectedList.color, borderLeftWidth: 3 } : {}}
          >
            <option value="">Inbox</option>
            {lists.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}

        {/* Goal picker */}
        {goals.length > 0 && (
          <select
            aria-label="Link to goal"
            value={goalId ?? ''}
            onChange={(e) => setGoalId(e.target.value || undefined)}
            className="text-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 outline-none focus:border-accent-400 transition-colors"
            style={selectedGoal ? { borderLeftColor: selectedGoal.color, borderLeftWidth: 3 } : {}}
          >
            <option value="">No goal</option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Repeat options panel */}
      {showRepeatPanel && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {REPEAT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={repeatFreq === value}
                onClick={() => {
                  setRepeatFreq(value)
                  if (value !== 'custom') setCustomDays([])
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                  repeatFreq === value
                    ? 'bg-accent-600 border-accent-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-accent-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {repeatFreq === 'custom' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Days:</span>
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={customDays.includes(i)}
                  aria-label={DAY_FULL[i]}
                  onClick={() => toggleCustomDay(i)}
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
      )}

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-700 my-3" />

      {/* Row 3: tag chip input */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-accent-400 hover:text-accent-600 ml-1"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < 5 && (
          <input
            type="text"
            aria-label="Add tag"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag..."
            className="text-sm bg-transparent outline-none text-gray-600 dark:text-gray-300 min-w-[80px]"
          />
        )}
      </div>
    </div>
  )
}
