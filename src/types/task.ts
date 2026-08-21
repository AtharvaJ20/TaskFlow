export type Priority = 'low' | 'medium' | 'high'

export interface TaskList {
  id: string
  name: string
  color: string   // hex
  createdAt: string
}
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface Recurrence {
  frequency: RecurrenceFrequency
  interval: number
  customDays?: number[]  // 0=Sun … 6=Sat, only used when frequency === 'custom'
}
export type Filter = 'all' | 'active' | 'completed'
export type SortBy = 'createdAt' | 'dueDate' | 'priority'
export type DueDateFilter = 'any' | 'today' | 'this-week' | 'overdue' | 'no-date'

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: Priority
  dueDate?: string       // ISO 8601 date string (YYYY-MM-DD)
  tags: string[]
  subtasks: Subtask[]
  recurrence?: Recurrence
  listId?: string        // undefined = Inbox
  createdAt: string      // ISO 8601 timestamp
  completedAt?: string   // set when completed flips to true
  timeLogged?: number    // total seconds focused via Focus Mode
  pinned?: boolean
}

export interface NewTaskInput {
  title: string
  description?: string
  priority?: Priority
  dueDate?: string
  tags?: string[]
  listId?: string
  recurrence?: Recurrence
}
