import { useEffect, useRef } from 'react'
import { isToday, parseISO } from 'date-fns'
import type { Task } from '../types/task'

export function useNotifications(tasks: Task[]) {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!('Notification' in window)) return

    const dueTodayTasks = tasks.filter(
      t => t.dueDate && !t.completed && isToday(parseISO(t.dueDate))
    )

    if (dueTodayTasks.length === 0) return

    async function notify() {
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }
      if (permission !== 'granted') return

      for (const task of dueTodayTasks) {
        if (notifiedRef.current.has(task.id)) continue
        notifiedRef.current.add(task.id)
        new Notification('TaskFlow — Due today', {
          body: task.title,
          icon: '/favicon.ico',
          tag: `task-${task.id}`,
        })
      }
    }

    notify()
  }, [tasks])
}
