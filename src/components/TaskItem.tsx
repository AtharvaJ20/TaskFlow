import React, { useState, useEffect } from 'react'
import { format, parseISO, isPast, isToday } from 'date-fns'
import type { Task, TaskList } from '../types/task'

interface TaskItemProps {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  onOpenModal: (task: Task) => void
  onTagClick: (tag: string) => void
  selected: boolean
  onSelect: (id: string) => void
  selectionActive: boolean
  isDragging?: boolean
  onDragStart?: (id: string) => void
  onDragOver?: (id: string) => void
  onDragEnd?: () => void
  taskList?: TaskList
  showList?: boolean
  onFocus?: (task: Task) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
}

function formatTimeLogged(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

const priorityStyles = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function TaskItem({ task, onToggle, onDelete, onUpdate, onOpenModal, onTagClick, selected, onSelect, selectionActive, isDragging, onDragStart, onDragOver, onDragEnd, taskList, showList, onFocus, onMoveUp, onMoveDown }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  useEffect(() => {
    if (!isEditing) setEditTitle(task.title)
  }, [task.title, isEditing])

  const isOverdue = task.dueDate && !task.completed && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate))
  const isDueToday = task.dueDate && !task.completed && isToday(parseISO(task.dueDate))

  function save() {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    }
    setIsEditing(false)
  }

  function cancel() {
    setEditTitle(task.title)
    setIsEditing(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') save()
    else if (e.key === 'Escape') cancel()
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(task.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(task.id) }}
      onDragEnd={onDragEnd}
      className={`bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 flex items-start gap-3 group motion-safe:animate-fade-in transition-opacity ${
        isDragging ? 'opacity-40' : 'opacity-100'
      } ${
        isOverdue
          ? 'border-red-300 dark:border-red-700 border-l-4 border-l-red-500'
          : isDueToday
            ? 'border-amber-300 dark:border-amber-600 border-l-4 border-l-amber-500'
            : selected
              ? 'border-accent-300 dark:border-accent-600'
              : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Desktop drag handle */}
      <span
        aria-hidden="true"
        className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <circle cx="5.5" cy="4" r="1.2" /><circle cx="10.5" cy="4" r="1.2" />
          <circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" />
          <circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="12" r="1.2" />
        </svg>
      </span>

      {/* Mobile reorder buttons */}
      <div className="flex sm:hidden flex-col flex-shrink-0 gap-0.5 mt-0.5">
        <button
          type="button"
          onClick={() => onMoveUp?.(task.id)}
          disabled={!onMoveUp}
          aria-label="Move task up"
          className="text-gray-300 dark:text-gray-600 disabled:opacity-20 hover:text-gray-500 dark:hover:text-gray-400 transition-colors focus:outline-none"
        >
          <svg viewBox="0 0 10 10" fill="currentColor" className="w-3 h-3" aria-hidden="true">
            <path d="M5 2L1 7h8L5 2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onMoveDown?.(task.id)}
          disabled={!onMoveDown}
          aria-label="Move task down"
          className="text-gray-300 dark:text-gray-600 disabled:opacity-20 hover:text-gray-500 dark:hover:text-gray-400 transition-colors focus:outline-none"
        >
          <svg viewBox="0 0 10 10" fill="currentColor" className="w-3 h-3" aria-hidden="true">
            <path d="M5 8L9 3H1L5 8z" />
          </svg>
        </button>
      </div>

      {/* Selection checkbox — visible on hover or when selection mode is active */}
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={selected ? `Deselect "${task.title}"` : `Select "${task.title}"`}
        onClick={() => onSelect(task.id)}
        className={`p-0 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-500 ${
          selected
            ? 'opacity-100 bg-accent-600 border-accent-600'
            : selectionActive
              ? 'opacity-100 border-gray-300 dark:border-gray-600'
              : 'opacity-0 group-hover:opacity-100 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
        }`}
      >
        {selected && (
          <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
            <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        onClick={() => onToggle(task.id)}
        className={
          task.completed
            ? 'p-0 w-5 h-5 rounded-full bg-indigo-600 border-2 border-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
            : 'p-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
        }
      >
        {task.completed && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            aria-hidden="true"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            autoFocus
            aria-label="Edit task title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={save}
            onKeyDown={handleTitleKeyDown}
            className={`font-medium bg-transparent outline-none border-b border-indigo-400 w-full ${
              task.completed
                ? 'line-through text-gray-400'
                : 'text-gray-900 dark:text-white'
            }`}
          />
        ) : (
          <button
            type="button"
            onClick={() => onOpenModal(task)}
            onDoubleClick={(e) => { e.preventDefault(); setEditTitle(task.title); setIsEditing(true) }}
            aria-label={`Edit task: ${task.title}`}
            className={`p-0 bg-transparent font-medium cursor-pointer text-left w-full focus:outline-none focus:underline ${
              task.completed
                ? 'line-through text-gray-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.title}
          </button>
        )}

        {/* Due date + priority + notes indicator */}
        {(task.dueDate || task.priority || task.description) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-400'
                }`}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                >
                  <rect
                    x="2"
                    y="3"
                    width="12"
                    height="11"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5 2v2M11 2v2M2 7h12"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                {format(parseISO(task.dueDate), 'MMM d')}
              </span>
            )}
            {isOverdue && (
              <span className="text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full">
                Overdue
              </span>
            )}
            {isDueToday && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                Due today
              </span>
            )}

            {task.recurrence && (
              <span
                title={`Repeats ${task.recurrence.frequency}`}
                aria-label={`Repeats ${task.recurrence.frequency}`}
                className="flex items-center gap-0.5 text-xs text-accent-500 dark:text-accent-400"
              >
                <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3" aria-hidden="true">
                  <path d="M2 7a5 5 0 0 1 9-3M12 7a5 5 0 0 1-9 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M10.5 3.5L11 1l1.5 2.5-2.5.5M3.5 10.5L3 13 1.5 10.5l2.5-.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {task.recurrence.frequency}
              </span>
            )}

            {showList && taskList && (
              <span
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                title={`List: ${taskList.name}`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: taskList.color }}
                  aria-hidden="true"
                />
                {taskList.name}
              </span>
            )}

            {task.description && (
              <span
                title={task.description}
                aria-label="Has notes"
                className="text-gray-400 dark:text-gray-500"
              >
                <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                  <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
            )}

            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[task.priority]}`}
            >
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {task.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => { e.stopPropagation(); onTagClick(tag) }}
                aria-label={`Filter by tag: ${tag}`}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full hover:bg-accent-100 dark:hover:bg-accent-900/40 hover:text-accent-600 dark:hover:text-accent-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Subtask progress + time logged */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {(task.subtasks ?? []).length > 0 && (
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true">
                <path d="M2 4h10M2 7h6M2 10h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {(task.subtasks ?? []).filter(s => s.completed).length}/{(task.subtasks ?? []).length}
              </span>
            </div>
          )}
          {(task.timeLogged ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {formatTimeLogged(task.timeLogged!)}
            </div>
          )}
        </div>
      </div>

      {/* Focus button */}
      {onFocus && !task.completed && (
        <button
          type="button"
          onClick={() => onFocus(task)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-accent-500 flex-shrink-0 mt-0.5 focus:outline-none focus:opacity-100"
          aria-label={`Focus on: ${task.title}`}
          title="Focus mode"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 flex-shrink-0 mt-0.5"
        aria-label="Delete task"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
        >
          <path
            d="M3 4h10M6 4V3h4v1M5 4l.5 8h5L11 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
