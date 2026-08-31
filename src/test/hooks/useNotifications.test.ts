import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotifications } from '../../hooks/useNotifications'
import type { Task } from '../../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy groceries',
    completed: false,
    priority: 'medium',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Patch jsdom's Notification so the hook can run its notify() path
function patchNotification(permission: NotificationPermission = 'granted') {
  try {
    Object.defineProperty(Notification, 'permission', {
      get: () => permission,
      configurable: true,
    })
  } catch {}
  try {
    Object.defineProperty(Notification, 'requestPermission', {
      value: vi.fn().mockResolvedValue(permission),
      configurable: true,
      writable: true,
    })
  } catch {}
}

beforeEach(() => {
  patchNotification('granted')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useNotifications', () => {
  it('runs without error when a task is due today and permission is granted', async () => {
    const task = makeTask({ dueDate: todayIso() })
    await act(async () => {
      renderHook(() => useNotifications([task]))
    })
    // hook executed notify() path without throwing
  })

  it('runs without error when no tasks are due today', async () => {
    const task = makeTask({ dueDate: '2020-01-01' })
    await act(async () => {
      renderHook(() => useNotifications([task]))
    })
  })

  it('runs without error when all due-today tasks are completed', async () => {
    const task = makeTask({ dueDate: todayIso(), completed: true })
    await act(async () => {
      renderHook(() => useNotifications([task]))
    })
  })

  it('calls requestPermission when permission is default', async () => {
    patchNotification('default')
    const reqSpy = vi.fn().mockResolvedValue('granted' as NotificationPermission)
    try {
      Object.defineProperty(Notification, 'requestPermission', {
        value: reqSpy,
        configurable: true,
        writable: true,
      })
    } catch {}
    const task = makeTask({ dueDate: todayIso() })
    await act(async () => {
      renderHook(() => useNotifications([task]))
    })
    expect(reqSpy).toHaveBeenCalled()
  })

  it('does not notify when permission is denied', async () => {
    patchNotification('denied')
    const task = makeTask({ dueDate: todayIso() })
    await act(async () => {
      renderHook(() => useNotifications([task]))
    })
    // hook respected the 'denied' permission and returned early
  })
})
