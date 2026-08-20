import { useEffect, useRef } from 'react'

interface HelpModalProps {
  onClose: () => void
}

interface HelpItem {
  title: string
  description: string
  tip?: string
  shortcut?: string
}

interface Section {
  heading: string
  icon: string
  items: HelpItem[]
}

const SECTIONS: Section[] = [
  {
    heading: 'Adding Tasks',
    icon: 'M12 5v14M5 12h14',
    items: [
      {
        title: 'Create a task',
        description: 'Type in the top input and press Enter or click Add.',
        shortcut: 'n — focus the input from anywhere',
      },
      {
        title: 'Priority',
        description: 'Choose Low, Medium, or High before adding. Color-coded on each task card.',
      },
      {
        title: 'Due date',
        description: 'Hit Today, Tomorrow, or pick a custom date with the calendar icon. Click × to clear it.',
      },
      {
        title: 'Repeat',
        description: 'Click the ↻ chip to schedule a recurring task — Daily, Weekly, Monthly, or Custom days (pick any combination of Sun–Sat).',
      },
      {
        title: 'Tags',
        description: 'Type a tag in the bottom row and press Enter or comma to add it. Up to 5 tags per task. Click any tag in the list to filter by it.',
      },
      {
        title: 'List assignment',
        description: 'Use the list dropdown on the right to place the task into a specific list instead of Inbox.',
      },
    ],
  },
  {
    heading: 'Managing Tasks',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 0-2-2V5a2 2 0 0 1 2-2h11',
    items: [
      {
        title: 'Complete a task',
        description: 'Click the circle on the left of any task to toggle it done. Recurring tasks automatically spawn the next occurrence.',
      },
      {
        title: 'Edit a task',
        description: 'Click the pencil icon (or anywhere on the task title) to open the detail modal. Edit title, description, priority, due date, tags, list, subtasks, and repeat.',
      },
      {
        title: 'Delete a task',
        description: 'Click the trash icon on a task card. An Undo banner appears at the bottom for a few seconds.',
      },
      {
        title: 'Subtasks',
        description: 'Open the task modal and use the Subtasks section to add checklist items. Track progress on each task card.',
      },
      {
        title: 'Drag to reorder',
        description: 'Grab the ⠿ handle on the left of any task card and drag it to a new position in the list.',
      },
      {
        title: 'Bulk actions',
        description: 'Click the checkbox on any task to enter selection mode. Select multiple tasks, then use the action bar at the bottom to mark all complete or delete all.',
      },
    ],
  },
  {
    heading: 'Filtering & Searching',
    icon: 'M3 6h18M7 12h10M11 18h2',
    items: [
      {
        title: 'View filters',
        description: 'All Tasks, Active, and Completed — in the sidebar. Shows only tasks in the selected state.',
      },
      {
        title: 'Search',
        description: 'The search bar in the toolbar filters tasks by title in real time.',
      },
      {
        title: 'Sort',
        description: 'Sort by date added, due date, or priority using the toolbar dropdown.',
      },
      {
        title: 'Advanced filters',
        description: 'Click the filter icon in the toolbar to filter by due date range (Today, This Week, Overdue, No Date) or by priority.',
      },
      {
        title: 'Filter by tag',
        description: 'Click any tag chip on a task card to filter the entire list to that tag. Clear it from the sidebar or toolbar.',
      },
    ],
  },
  {
    heading: 'Lists',
    icon: 'M4 6h16M4 10h16M4 14h8',
    items: [
      {
        title: 'Inbox',
        description: 'Tasks with no list assigned land in Inbox. It\'s the default home for unorganised tasks.',
      },
      {
        title: 'Create a list',
        description: 'Click + next to "Lists" in the sidebar. Pick a color, type a name, and press Enter.',
      },
      {
        title: 'Switch lists',
        description: 'Click any list name in the sidebar to see only tasks in that list.',
      },
      {
        title: 'Delete a list',
        description: 'Hover over a list name and click the × that appears. Tasks in that list move back to Inbox.',
      },
    ],
  },
  {
    heading: 'Focus Mode',
    icon: 'M12 2a7 7 0 1 0 0 14A7 7 0 0 0 12 2zM12 6v6l4 2',
    items: [
      {
        title: 'Start a session',
        description: 'Click the ⚡ focus button on any task card to open the Focus Mode timer with that task.',
      },
      {
        title: 'Pomodoro timer',
        description: 'Work and Break intervals run back-to-back. Default is 25 min focus + 5 min break.',
      },
      {
        title: 'Customize durations',
        description: 'Click the Focus or Break chip below the timer (when paused) to type a custom duration in minutes.',
      },
      {
        title: 'Alert sound',
        description: 'An audio alert fires when each interval ends. Configure volume, duration, and upload a custom sound file in the Alert Sound section of the sidebar.',
      },
      {
        title: 'Time tracking',
        description: 'Focused time is logged automatically per task. See totals on each task card and in Statistics.',
      },
      {
        title: 'Complete & exit',
        description: 'The Mark complete & exit button at the bottom marks the task done and closes the timer in one click.',
      },
      {
        shortcut: 'Space — play / pause the timer',
        title: 'Keyboard controls',
        description: 'Space bar toggles play/pause. Escape closes Focus Mode.',
      },
    ],
  },
  {
    heading: 'Calendar View',
    icon: 'M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    items: [
      {
        title: 'Switch to calendar',
        description: 'Click the calendar icon in the toolbar. Tasks with due dates appear on their due day.',
      },
      {
        title: 'Open a task',
        description: 'Click any task chip in the calendar to open its detail modal.',
      },
    ],
  },
  {
    heading: 'Statistics',
    icon: 'M3 17l5-5 4 4 5-6 4 3',
    items: [
      {
        title: 'View your stats',
        description: 'Click Statistics in the sidebar to see completion trends, total focus time, tasks by priority, and a weekly activity chart.',
      },
    ],
  },
  {
    heading: 'Import & Export',
    icon: 'M12 16V4m0 0L8 8m4-4l4 4M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2',
    items: [
      {
        title: 'Export tasks',
        description: 'Click the export icon in the toolbar to download all tasks as JSON (full data) or CSV (spreadsheet-friendly).',
      },
      {
        title: 'Import tasks',
        description: 'Click the import icon and pick a .json or .csv file exported from TaskFlow. Tasks are merged with your existing list.',
      },
    ],
  },
  {
    heading: 'Customisation',
    icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    items: [
      {
        title: 'Accent color',
        description: 'Pick from 6 accent colors in the sidebar — changes buttons, highlights, and interactive elements across the whole app.',
      },
      {
        title: 'Dark / Light mode',
        description: 'Toggle the sun/moon icon in the top of the sidebar to switch themes.',
      },
      {
        title: 'Alert sound',
        description: 'Expand Alert Sound in the sidebar to adjust volume, alert duration, and optionally upload your own audio file (MP3, WAV, OGG).',
      },
    ],
  },
  {
    heading: 'Account & Sync',
    icon: 'M20 12V22H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
    items: [
      {
        title: 'Sign in',
        description: 'Create a free account to sync tasks across all your devices. Click Sign in at the bottom of the sidebar.',
      },
      {
        title: 'Guest mode',
        description: 'Use the app without an account. Tasks are stored locally in your browser. Switching devices or clearing browser storage will lose data.',
      },
      {
        title: 'Sign out',
        description: 'Click the sign-out icon next to your email in the sidebar Account section.',
      },
    ],
  },
  {
    heading: 'Keyboard Shortcuts',
    icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
    items: [
      { title: 'n', description: 'Focus the new task input from anywhere on the page.' },
      { title: 'Enter', description: 'Submit the task when the input is focused.' },
      { title: 'Escape', description: 'Close any open modal, clear the search bar, or exit Focus Mode.' },
      { title: 'Space', description: 'Play / pause the timer while Focus Mode is open.' },
    ],
  },
]

export default function HelpModal({ onClose }: HelpModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Help"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-100 dark:bg-accent-900/50 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-accent-600 dark:text-accent-400" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 7a2 2 0 0 1 1.73 3C11 11 10 11.5 10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="10" cy="15.5" r="0.75" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Help & Features</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Everything TaskFlow can do</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-7">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-accent-500 flex-shrink-0" aria-hidden="true">
                  <path d={section.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {section.heading}
                </h3>
              </div>

              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
                    </div>
                    {item.shortcut && (
                      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-0.5 font-mono whitespace-nowrap mt-0.5">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-2">
            TaskFlow · press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
