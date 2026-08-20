import type { Task } from '../types/task'

function isValidTask(obj: unknown): obj is Task {
  if (!obj || typeof obj !== 'object') return false
  const t = obj as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.completed === 'boolean' &&
    ['low', 'medium', 'high'].includes(t.priority as string) &&
    Array.isArray(t.tags) &&
    typeof t.createdAt === 'string'
  )
}

export function importFromJSON(json: string): Task[] {
  const parsed = JSON.parse(json)
  const arr = Array.isArray(parsed) ? parsed : []
  const valid = arr.filter(isValidTask)
  if (valid.length === 0) throw new Error('No valid tasks found in JSON')
  return valid.map(t => ({ ...t, subtasks: t.subtasks ?? [] }))
}

export function importFromCSV(csv: string): Partial<Task>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV has no data rows')
  // Skip header row; columns: Title,Status,Priority,Due Date,Tags,Created At,Completed At
  return lines.slice(1).map(line => {
    const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g) ?? []
    const unquote = (s: string) => s.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
    const title = unquote(cols[0] ?? '')
    const completed = (cols[1] ?? '').trim() === 'Completed'
    const priority = (['low', 'medium', 'high'].includes((cols[2] ?? '').trim())
      ? (cols[2] ?? '').trim()
      : 'medium') as Task['priority']
    const dueDate = unquote(cols[3] ?? '') || undefined
    const tagsRaw = unquote(cols[4] ?? '')
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
    const createdAt = unquote(cols[5] ?? '') || new Date().toISOString()
    if (!title) return null
    return { title, completed, priority, dueDate, tags, createdAt, subtasks: [] } as Partial<Task>
  }).filter(Boolean) as Partial<Task>[]
}
