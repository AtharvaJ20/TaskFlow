import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportCSV, exportJSON } from '../../utils/exportTasks'
import type { Task } from '../../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Buy milk',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

let capturedBlob: Blob | null = null

beforeEach(() => {
  capturedBlob = null
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((b: Blob) => { capturedBlob = b; return 'blob:fake' }),
    revokeObjectURL: vi.fn(),
  })
  // prevent real DOM side effects from anchor click
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ── exportJSON ─────────────────────────────────────────────────────────────────

describe('exportJSON', () => {
  it('serialises tasks as pretty-printed JSON', async () => {
    const task = makeTask()
    exportJSON([task])
    expect(capturedBlob).not.toBeNull()
    const text = await capturedBlob!.text()
    const parsed = JSON.parse(text)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].title).toBe('Buy milk')
  })

  it('produces a Blob with application/json MIME type', () => {
    exportJSON([makeTask()])
    expect(capturedBlob!.type).toBe('application/json')
  })

  it('exports an empty array without throwing', async () => {
    exportJSON([])
    const text = await capturedBlob!.text()
    expect(JSON.parse(text)).toEqual([])
  })

  it('calls URL.revokeObjectURL after the click', () => {
    exportJSON([makeTask()])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })

  it('escapes special characters in titles correctly (round-trip)', async () => {
    const task = makeTask({ title: 'Buy "milk" & bread' })
    exportJSON([task])
    const text = await capturedBlob!.text()
    const parsed = JSON.parse(text)
    expect(parsed[0].title).toBe('Buy "milk" & bread')
  })
})

// ── exportCSV ─────────────────────────────────────────────────────────────────

describe('exportCSV', () => {
  it('produces a Blob with text/csv MIME type', () => {
    exportCSV([makeTask()])
    expect(capturedBlob!.type).toBe('text/csv')
  })

  it('includes a header row', async () => {
    exportCSV([makeTask()])
    const text = await capturedBlob!.text()
    expect(text.split('\n')[0]).toBe('Title,Status,Priority,Due Date,Tags,Created At,Completed At')
  })

  it('marks completed tasks as Completed in the Status column', async () => {
    exportCSV([makeTask({ completed: true })])
    const text = await capturedBlob!.text()
    const dataRow = text.split('\n')[1]
    expect(dataRow).toContain('Completed')
  })

  it('marks active tasks as Active in the Status column', async () => {
    exportCSV([makeTask({ completed: false })])
    const text = await capturedBlob!.text()
    const dataRow = text.split('\n')[1]
    expect(dataRow).toContain('Active')
  })

  it('double-quotes titles containing commas', async () => {
    exportCSV([makeTask({ title: 'Milk, eggs' })])
    const text = await capturedBlob!.text()
    expect(text).toContain('"Milk, eggs"')
  })

  it('escapes internal double-quotes in titles as ""', async () => {
    exportCSV([makeTask({ title: 'Say "hello"' })])
    const text = await capturedBlob!.text()
    expect(text).toContain('"Say ""hello"""')
  })

  it('joins multiple tags with a comma and space', async () => {
    exportCSV([makeTask({ tags: ['work', 'health'] })])
    const text = await capturedBlob!.text()
    expect(text).toContain('"work, health"')
  })

  it('emits an empty dueDate column when not set', async () => {
    exportCSV([makeTask()])
    const text = await capturedBlob!.text()
    // dueDate column (4th) should be empty
    const dataRow = text.split('\n')[1]
    const cols = dataRow.split(',')
    expect(cols[3]).toBe('')
  })

  it('produces one data row per task', async () => {
    exportCSV([makeTask({ id: 't1' }), makeTask({ id: 't2', title: 'Walk dog' })])
    const text = await capturedBlob!.text()
    const lines = text.split('\n')
    expect(lines).toHaveLength(3) // header + 2 rows
  })
})
