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

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { fields.push(current); current = '' }
      else current += ch
    }
  }
  fields.push(current)
  return fields
}

export function importFromCSV(csv: string): Partial<Task>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) throw new Error('CSV has no data rows')
  // Skip header row; columns: Title,Status,Priority,Due Date,Tags,Created At,Completed At
  return lines.slice(1).map(line => {
    const cols = parseCSVLine(line)
    const title = (cols[0] ?? '').trim()
    const completed = (cols[1] ?? '').trim() === 'Completed'
    const priority = (['low', 'medium', 'high'].includes((cols[2] ?? '').trim())
      ? (cols[2] ?? '').trim()
      : 'medium') as Task['priority']
    const dueDate = (cols[3] ?? '').trim() || undefined
    const tagsRaw = (cols[4] ?? '').trim()
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
    const createdAt = (cols[5] ?? '').trim() || new Date().toISOString()
    if (!title) return null
    return { title, completed, priority, dueDate, tags, createdAt, subtasks: [] } as Partial<Task>
  }).filter(Boolean) as Partial<Task>[]
}
