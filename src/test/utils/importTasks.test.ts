import { describe, expect, it } from 'vitest'
import { importFromCSV, importFromJSON } from '../../utils/importTasks'

// ── importFromJSON ─────────────────────────────────────────────────────────────

describe('importFromJSON', () => {
  function validTask(overrides = {}) {
    return {
      id: 'abc',
      title: 'Buy milk',
      completed: false,
      priority: 'medium',
      tags: [],
      subtasks: [],
      createdAt: '2025-01-01T00:00:00Z',
      ...overrides,
    }
  }

  it('parses a valid JSON array and returns tasks', () => {
    const tasks = importFromJSON(JSON.stringify([validTask()]))
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Buy milk')
  })

  it('defaults subtasks to [] when the field is missing', () => {
    const raw = validTask()
    delete (raw as Record<string, unknown>).subtasks
    const tasks = importFromJSON(JSON.stringify([raw]))
    expect(tasks[0].subtasks).toEqual([])
  })

  it('filters out objects missing required fields', () => {
    const bad = { title: 'No id', completed: false }
    const good = validTask({ id: 'x1' })
    const tasks = importFromJSON(JSON.stringify([bad, good]))
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('x1')
  })

  it('throws when no valid tasks are found', () => {
    expect(() => importFromJSON(JSON.stringify([{ bad: true }]))).toThrow('No valid tasks found')
  })

  it('throws when JSON is not an array', () => {
    expect(() => importFromJSON(JSON.stringify({ title: 'oops' }))).toThrow('No valid tasks found')
  })

  it('rejects tasks with an invalid priority value', () => {
    const bad = validTask({ priority: 'urgent' })
    expect(() => importFromJSON(JSON.stringify([bad]))).toThrow()
  })

  it('throws on malformed JSON string', () => {
    expect(() => importFromJSON('not json')).toThrow()
  })

  it('preserves extra fields (e.g. dueDate, goalId) on valid tasks', () => {
    const task = validTask({ dueDate: '2025-06-01', goalId: 'g1' })
    const result = importFromJSON(JSON.stringify([task]))
    expect(result[0].dueDate).toBe('2025-06-01')
    // @ts-expect-error goalId is a valid field at runtime
    expect(result[0].goalId).toBe('g1')
  })
})

// ── importFromCSV ─────────────────────────────────────────────────────────────

describe('importFromCSV', () => {
  const HEADER = 'Title,Status,Priority,Due Date,Tags,Created At,Completed At'

  function csvRow(fields: string[]) {
    return fields.join(',')
  }

  it('parses a basic row correctly', () => {
    const csv = [HEADER, csvRow(['"Buy milk"', 'Active', 'medium', '', '""', '2025-01-01', ''])].join('\n')
    const result = importFromCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Buy milk')
    expect(result[0].completed).toBe(false)
    expect(result[0].priority).toBe('medium')
  })

  it('maps Completed status correctly', () => {
    const csv = [HEADER, csvRow(['"Task"', 'Completed', 'high', '', '""', '2025-01-01', ''])].join('\n')
    const result = importFromCSV(csv)
    expect(result[0].completed).toBe(true)
  })

  it('defaults invalid priority to medium', () => {
    const csv = [HEADER, csvRow(['"Task"', 'Active', 'urgent', '', '""', '2025-01-01', ''])].join('\n')
    const result = importFromCSV(csv)
    expect(result[0].priority).toBe('medium')
  })

  it('parses multiple tags from a quoted comma-separated field', () => {
    const csv = [HEADER, csvRow(['"Task"', 'Active', 'low', '', '"work, health"', '2025-01-01', ''])].join('\n')
    const result = importFromCSV(csv)
    expect(result[0].tags).toEqual(['work', 'health'])
  })

  it('handles a title containing a comma (double-quoted)', () => {
    const csv = [HEADER, '"Buy milk, eggs",Active,medium,,"",' + '2025-01-01,'].join('\n')
    const result = importFromCSV(csv)
    expect(result[0]!.title).toBe('Buy milk, eggs')
  })

  it('handles a title containing a double-quote (escaped as "")', () => {
    const csv = [HEADER, '"Say ""hello""",Active,medium,,"",' + '2025-01-01,'].join('\n')
    const result = importFromCSV(csv)
    expect(result[0]!.title).toBe('Say "hello"')
  })

  it('filters out rows with empty titles', () => {
    const csv = [HEADER, csvRow(['""', 'Active', 'medium', '', '""', '2025-01-01', ''])].join('\n')
    const result = importFromCSV(csv)
    expect(result).toHaveLength(0)
  })

  it('throws when CSV has no data rows (header only)', () => {
    expect(() => importFromCSV(HEADER)).toThrow('CSV has no data rows')
  })

  it('sets dueDate when column is non-empty', () => {
    const csv = [HEADER, csvRow(['"Task"', 'Active', 'medium', '2025-06-15', '""', '2025-01-01', ''])].join('\n')
    const result = importFromCSV(csv)
    expect(result[0].dueDate).toBe('2025-06-15')
  })

  it('leaves dueDate undefined when column is empty', () => {
    const csv = [HEADER, csvRow(['"Task"', 'Active', 'medium', '', '""', '2025-01-01', ''])].join('\n')
    const result = importFromCSV(csv)
    expect(result[0].dueDate).toBeUndefined()
  })
})
