import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns'
import type { Task } from '../types/task'

interface CalendarViewProps {
  tasks: Task[]
  onOpenModal: (task: Task) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ tasks, onOpenModal }: CalendarViewProps) {
  const [current, setCurrent] = useState(new Date())

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)

  const days: Date[] = []
  let d = gridStart
  while (d <= gridEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  function tasksForDay(day: Date) {
    return tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day))
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {format(current, 'MMMM yyyy')}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
        {WEEKDAYS.map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayTasks = tasksForDay(day)
          const isCurrentMonth = isSameMonth(day, current)
          const isCurrentDay = isToday(day)
          return (
            <div
              key={i}
              className={`min-h-[80px] p-1.5 border-b border-r border-gray-100 dark:border-gray-700/60 ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/40' : ''
              } ${i % 7 === 6 ? 'border-r-0' : ''}`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${
                  isCurrentDay
                    ? 'bg-indigo-600 text-white'
                    : isCurrentMonth
                      ? 'text-gray-700 dark:text-gray-200'
                      : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 3).map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenModal(task)}
                    title={task.title}
                    className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                      task.completed
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 line-through'
                        : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60'
                    }`}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 px-1">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
