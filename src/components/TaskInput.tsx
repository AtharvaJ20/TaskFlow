import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { NewTaskInput, Priority, TaskList } from '../types/task'

interface TaskInputProps {
  onAdd: (input: NewTaskInput) => void
  lists: TaskList[]
  activeListId?: string | null
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

export default function TaskInput({ onAdd, lists, activeListId }: TaskInputProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [listId, setListId] = useState<string | undefined>(
    activeListId && activeListId !== 'inbox' && activeListId !== null ? activeListId : undefined
  )
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep listId in sync when active list changes externally
  useEffect(() => {
    if (activeListId && activeListId !== 'inbox') {
      setListId(activeListId)
    } else {
      setListId(undefined)
    }
  }, [activeListId])

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

  function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) return

    const input: NewTaskInput = {
      title: trimmed,
      priority,
      ...(dueDate ? { dueDate } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      ...(listId ? { listId } : {}),
    }
    onAdd(input)

    setTitle('')
    setPriority('medium')
    setDueDate('')
    setTags([])
    setTagInput('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const selectedList = lists.find(l => l.id === listId)

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

        <input
          type="date"
          aria-label="Due date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 outline-none focus:border-accent-400 dark:focus:border-accent-500 transition-colors"
        />

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
      </div>

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
