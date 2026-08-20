import type { Task } from '../types/task'

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportJSON(tasks: Task[]) {
  downloadBlob(JSON.stringify(tasks, null, 2), 'taskflow-export.json', 'application/json')
}

export function exportCSV(tasks: Task[]) {
  const header = 'Title,Status,Priority,Due Date,Tags,Created At,Completed At'
  const rows = tasks.map(t =>
    [
      `"${t.title.replace(/"/g, '""')}"`,
      t.completed ? 'Completed' : 'Active',
      t.priority,
      t.dueDate ?? '',
      `"${t.tags.join(', ')}"`,
      t.createdAt,
      t.completedAt ?? '',
    ].join(',')
  )
  downloadBlob([header, ...rows].join('\n'), 'taskflow-export.csv', 'text/csv')
}
