import { useRef, useState, useEffect } from 'react'
import type { Task, Filter, TaskList } from '../types/task'
import TaskItem from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  filter: Filter
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  onOpenModal: (task: Task) => void
  onTagClick: (tag: string) => void
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
  lists: TaskList[]
  showList: boolean
  onFocus: (task: Task) => void
}

const emptyMessages: Record<Filter, string> = {
  all: 'No tasks yet. Add one above.',
  active: 'All caught up! No active tasks.',
  completed: 'Nothing completed yet.',
}

function EmptyIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2.5" className="text-gray-300 dark:text-gray-600" />
      <path d="M24 8v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-gray-300 dark:text-gray-600" />
      <path d="M22 32l5 5 15-12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600" />
    </svg>
  )
}

export default function TaskList({ tasks, filter, onToggle, onDelete, onUpdate, onOpenModal, onTagClick, selectedIds, onSelect, onReorder, lists, showList, onFocus }: TaskListProps) {
  // Local display state so drag re-ordering doesn't trigger parent re-renders mid-drag
  const [localTasks, setLocalTasksState] = useState(tasks)
  const localTasksRef = useRef(tasks)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const draggingIdRef = useRef<string | null>(null)
  const isDraggingRef = useRef(false)
  const tasksAtDragStartRef = useRef<Task[]>([])

  function setLocalTasks(next: Task[]) {
    localTasksRef.current = next
    setLocalTasksState(next)
  }

  // Sync from parent when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalTasks(tasks)
    }
  }, [tasks])

  // ── Desktop HTML5 drag ────────────────────────────────────────────
  function handleDragStart(id: string) {
    isDraggingRef.current = true
    draggingIdRef.current = id
    tasksAtDragStartRef.current = [...localTasksRef.current]
    setDraggingId(id)
  }

  function handleDragOver(id: string) {
    const fromId = draggingIdRef.current
    if (!fromId || fromId === id) return
    setLocalTasks((() => {
      const prev = localTasksRef.current
      const fromIdx = prev.findIndex(t => t.id === fromId)
      const toIdx = prev.findIndex(t => t.id === id)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })())
  }

  function handleDragEnd() {
    isDraggingRef.current = false
    const origId = draggingIdRef.current
    draggingIdRef.current = null
    setDraggingId(null)

    if (origId) {
      const finalIdx = localTasksRef.current.findIndex(t => t.id === origId)
      const origIdx = tasksAtDragStartRef.current.findIndex(t => t.id === origId)
      if (finalIdx !== -1 && origIdx !== -1 && finalIdx !== origIdx) {
        const targetId = tasksAtDragStartRef.current[finalIdx]?.id
        if (targetId && targetId !== origId) {
          onReorder(origId, targetId)
        }
      }
    }
    tasksAtDragStartRef.current = []
  }

  // ── Mobile move up/down ───────────────────────────────────────────
  function handleMoveUp(id: string) {
    const cur = localTasksRef.current
    const idx = cur.findIndex(t => t.id === id)
    if (idx <= 0) return
    onReorder(id, cur[idx - 1].id)
  }

  function handleMoveDown(id: string) {
    const cur = localTasksRef.current
    const idx = cur.findIndex(t => t.id === id)
    if (idx === -1 || idx >= cur.length - 1) return
    onReorder(cur[idx + 1].id, cur[idx].id)
  }

  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center flex flex-col items-center">
        <EmptyIllustration />
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-3">{emptyMessages[filter]}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {localTasks.map((task, idx) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onOpenModal={onOpenModal}
          onTagClick={onTagClick}
          selected={selectedIds.has(task.id)}
          onSelect={onSelect}
          selectionActive={selectedIds.size > 0}
          isDragging={draggingId === task.id}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          taskList={lists.find(l => l.id === task.listId)}
          showList={showList}
          onFocus={onFocus}
          onMoveUp={idx > 0 ? handleMoveUp : undefined}
          onMoveDown={idx < localTasks.length - 1 ? handleMoveDown : undefined}
        />
      ))}
    </div>
  )
}
