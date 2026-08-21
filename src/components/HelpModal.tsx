import { useEffect, useRef, useState } from 'react'

interface HelpModalProps {
  onClose: () => void
  onReplayTour?: () => void
}

interface HelpItem {
  title: string
  description: string
  example?: string
  shortcut?: string
}

interface Section {
  heading: string
  icon: string
  color: string
  items: HelpItem[]
}

const SECTIONS: Section[] = [
  {
    heading: 'Adding Tasks',
    icon: 'M12 5v14M5 12h14',
    color: 'text-violet-500',
    items: [
      {
        title: 'Create a task',
        description: 'Click the task input at the top of the page, type your task, then press Enter or click Add.',
        example: 'Type "Buy groceries" → press Enter. The task appears instantly in your list.',
        shortcut: 'n',
      },
      {
        title: 'Set priority',
        description: 'Pick Low, Medium, or High in the row below the input before adding. The badge color appears on every task card.',
        example: '"Submit project report" → set High so it floats visually and sorts to the top when you sort by priority.',
      },
      {
        title: 'Set a due date',
        description: 'Click Today or Tomorrow for quick shortcuts, or the 📅 icon to pick any date. Click × on an existing date to clear it.',
        example: '"Dentist appointment" → click Tomorrow → date is set without opening a full calendar.',
      },
      {
        title: 'Repeat / Recurrence',
        description: 'Click the ↻ chip to schedule a task that repeats. Choose Daily, Weekly, Monthly, or Custom — which lets you pick specific weekdays. When you complete a recurring task, the next occurrence is created automatically but stays hidden until its due date.',
        example: '"Water plants" → ↻ → Custom → toggle Mo, We, Fr. Complete today\'s task → tomorrow\'s won\'t appear in your list until that day arrives.',
      },
      {
        title: 'Add tags',
        description: 'In the tag row at the bottom of the input, type a word and press Enter or comma. Up to 5 tags per task. Tags are clickable to filter.',
        example: 'Type "work" → Enter → type "urgent" → Enter. Now you can click the "work" tag on any card to see all work tasks.',
      },
      {
        title: 'Assign to a list',
        description: 'Use the list dropdown (far right of row 2) to place the task in a specific list instead of Inbox.',
        example: '"Design mockup" → select "Work" list → the task only appears when you click Work in the sidebar.',
      },
    ],
  },
  {
    heading: 'Managing Tasks',
    icon: 'M5 13l4 4L19 7',
    color: 'text-emerald-500',
    items: [
      {
        title: 'Complete a task',
        description: 'Click the circle on the left of any task card to mark it done. It moves to Completed. Click it again to reopen it.',
        example: '"Buy milk" → click circle → task moves to Completed filter. If it was a daily repeat, tomorrow\'s occurrence is created in Active.',
      },
      {
        title: 'Edit a task',
        description: 'Click the pencil ✏ icon on a task card (or the task title) to open the detail panel. Edit any field and save.',
        example: '"Call doctor" was Medium priority — new info makes it urgent. Open modal → change to High → Save.',
      },
      {
        title: 'Delete a task',
        description: 'Click the trash 🗑 icon on a task card. An Undo banner appears at the bottom of the screen for a few seconds.',
        example: 'Delete "Old meeting notes" by mistake → click Undo in the banner → task is restored instantly.',
      },
      {
        title: 'Add subtasks',
        description: 'Open a task modal → use the Subtasks section to add checklist items. Each subtask has its own completion checkbox. Progress shows on the card.',
        example: '"Plan vacation" → subtasks: "Book flights", "Reserve hotel", "Pack bags". Card shows "1/3" until all are checked.',
      },
      {
        title: 'Pin a task',
        description: 'Click the 📌 pin icon on a task card to keep it at the top of your list regardless of sort order or due date. Pin it again to unpin.',
        example: 'Pin "Drink water every hour" so it\'s always visible at the top, even when you sort by due date or priority.',
      },
      {
        title: 'Reorder tasks',
        description: 'Grab the ⠿ drag handle that appears on the left edge of a task card and drag it up or down.',
        example: 'Drag "Team standup" above "Reply to emails" to put your morning tasks first.',
      },
      {
        title: 'Bulk actions',
        description: 'Click the checkbox icon on any task card to enter multi-select mode. Select as many tasks as you need, then use the bar at the bottom to complete or delete them all.',
        example: 'Select 5 old completed tasks → Delete All → all 5 are gone in one action instead of five separate deletes.',
      },
    ],
  },
  {
    heading: 'Filtering & Searching',
    icon: 'M3 6h18M7 12h10M11 18h2',
    color: 'text-blue-500',
    items: [
      {
        title: 'View filters (sidebar)',
        description: 'Click All Tasks, Active, or Completed in the sidebar to switch the visible set. The count badge shows how many tasks are in each view.',
        example: 'Click Active to hide everything you\'ve already finished and focus only on what needs doing today.',
      },
      {
        title: 'Search',
        description: 'Type in the search bar in the toolbar. The task list filters in real time as you type — no need to press Enter.',
        example: 'Type "doctor" → instantly see "Call doctor" and "Doctor follow-up" while everything else hides.',
      },
      {
        title: 'Sort',
        description: 'Use the Sort dropdown in the toolbar to reorder by: Date added, Due date, or Priority.',
        example: 'Sort by Due Date on a busy week → tasks closest to their deadline rise to the top.',
      },
      {
        title: 'Advanced filters',
        description: 'Click the filter funnel icon in the toolbar to open advanced options: filter by due date window (Today / This Week / Overdue / No Date) or by a specific priority level.',
        example: 'Filter by Overdue → see only tasks you\'ve missed. Filter by High priority → see only critical items regardless of due date.',
      },
      {
        title: 'Filter by tag',
        description: 'Click any tag chip on a task card to instantly filter the entire list to tasks sharing that tag. Clear it via the × in the toolbar or sidebar.',
        example: 'Click the "shopping" tag on any card → only tasks tagged "shopping" appear. Click × to return to the full list.',
      },
    ],
  },
  {
    heading: 'Lists',
    icon: 'M4 6h16M4 10h16M4 14h8',
    color: 'text-orange-500',
    items: [
      {
        title: 'Inbox',
        description: 'Any task you add without choosing a list lands in Inbox. It\'s your catch-all for quick captures.',
        example: '"Buy milk" and "Pick up parcel" — quick one-offs that don\'t belong to any project. Add them fast, deal with them fast.',
      },
      {
        title: 'Create a list',
        description: 'Click the + button next to "Lists" in the sidebar. Choose a dot color, type a name, and press Enter.',
        example: 'Create "Work" (blue) for job tasks, "Personal" (green) for errands, "Learning" (purple) for books and courses.',
      },
      {
        title: 'Switch lists',
        description: 'Click any list name in the sidebar to see only tasks assigned to that list. Click "All lists" to see everything.',
        example: 'Before a team meeting: click "Work" list → you see only work tasks and can stay focused without personal tasks distracting you.',
      },
      {
        title: 'Delete a list',
        description: 'Hover over a list name in the sidebar — a × appears on the right. Click it. Tasks from that list return to Inbox automatically.',
        example: 'Project "Website Redesign" is done. Delete the list → all its tasks move to Inbox where you can archive or clean them up.',
      },
    ],
  },
  {
    heading: 'Goals',
    icon: 'M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3zm0 5v4m0 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
    color: 'text-purple-500',
    items: [
      {
        title: 'Two goal types',
        description: 'TaskFlow has two kinds of goals. Task-based goals track progress by counting linked task completions (e.g. "Launch MVP" tracked via work tasks). Metric goals track a number you update manually — weight, savings, pages read, or anything numeric.',
        example: '"Read 300 pages" → Metric goal → start 0, target 300, unit pages. Log your current page count after each session and watch the bar fill.',
      },
      {
        title: 'Create a task-based goal',
        description: 'Click Goals in the sidebar → "New goal" → choose Task-based. Set a title, deadline, and colour. Progress is calculated from how many linked tasks you\'ve completed vs how many are expected by the deadline.',
        example: '"Launch MVP" → Task-based → deadline Dec 31 → indigo. Link tasks like "Write landing page" and "Set up payments". Progress reflects your pace relative to the deadline.',
      },
      {
        title: 'Create a metric goal',
        description: 'Click Goals → "New goal" → choose Metric-based. Set a start value, target value, and unit. Log your current value any time via the "Log progress" button on the goal card.',
        example: '"Lose weight" → Metric → start 85 kg, target 75 kg. After each weigh-in, tap "Log progress" and enter your current weight. The card shows velocity per day and a projected finish date.',
      },
      {
        title: 'Link a task to a goal',
        description: 'When adding a task, use the Goal dropdown in the quick-add bar to attach it to a task-based goal. You can also open any existing task and set the Goal field in the detail panel.',
        example: '"Write landing page copy" → Goal: "Launch MVP" → Add. The task now counts toward that goal\'s progress when completed.',
      },
      {
        title: 'Task-based progress formula',
        description: 'Progress is based on your goal\'s full duration, not just tasks that exist so far. For a 30-day daily goal, completing day 1 shows ~3% — not 100% — because 29 more days of completions are expected.',
        example: '"Read daily for a month" → you complete day 1 → goal shows 3% because the full 30 completions are expected over 30 days.',
      },
      {
        title: 'Status badges',
        description: 'Each goal card automatically calculates your status: On track · At risk · Overdue · Complete. Based on your recent velocity vs what\'s needed to hit the deadline.',
        example: '"At risk" means your last 7-day rate is too slow to finish before the deadline. Speed up or move the deadline.',
      },
      {
        title: 'Edit or delete a goal',
        description: 'Click the pencil ✏ icon on any goal card to edit its title, description, deadline, or colour. The goal type cannot be changed after creation. Delete from the same modal.',
        example: 'Deadline moved to next month? Click ✏ → change the date → Save. Linked tasks and logged progress entries are unaffected.',
      },
    ],
  },
  {
    heading: 'Focus Mode (Pomodoro)',
    icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    color: 'text-red-500',
    items: [
      {
        title: 'Start a session',
        description: 'Click the ⚡ lightning bolt button on any task card. Focus Mode opens with that task loaded and a 25-minute countdown ready.',
        example: 'Click ⚡ on "Write project proposal" → the timer starts for that specific task. Everything else fades out.',
      },
      {
        title: 'Timer survives phone lock',
        description: 'The timer keeps accurate time even if your phone screen locks or the browser tab goes to the background. When you unlock, it snaps to the correct remaining time instantly.',
        example: 'Start a 25-minute session, lock your phone for 10 minutes → unlock → timer correctly shows 15 minutes remaining.',
      },
      {
        title: 'Pomodoro rhythm',
        description: 'The timer runs Focus → Break → Focus → Break in a loop. The phase switches automatically and plays an alert sound.',
        example: '25 min writing → bell rings → 5 min break → bell rings → back to writing. After 4 rounds, take a longer break.',
      },
      {
        title: 'Customize durations',
        description: 'While paused, click the "Focus 25m" or "Break 5m" chip and type a new number of minutes. The timer updates immediately.',
        example: 'For deep work: change Focus to 50 min and Break to 10 min. For short tasks: 15 min focus, 3 min break.',
      },
      {
        title: 'Alert sound',
        description: 'A sound plays when each phase ends. Configure it in Alert Sound in the sidebar: adjust volume, length, or upload an MP3/WAV/OGG file.',
        example: 'Upload a soft Tibetan bell as your focus-end sound. Set volume to 30% for open offices.',
      },
      {
        title: 'Automatic time tracking',
        description: 'Every second of focus time is logged to the task. The total shows on the task card and in Statistics.',
        example: 'Three 25-min sessions on "Write report" → card shows "1h 15m total". Statistics shows your productivity graph for the week.',
      },
      {
        title: 'Mark complete & exit',
        description: 'When the task is done, click Mark complete & exit at the bottom. This completes the task and closes Focus Mode in one click.',
        example: 'Finished drafting the email during the session → click Mark complete & exit → task is done, timer is gone, you\'re back to the list.',
      },
    ],
  },
  {
    heading: 'Calendar View',
    icon: 'M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    color: 'text-cyan-500',
    items: [
      {
        title: 'Switch to Calendar',
        description: 'Click the calendar grid icon in the toolbar (next to the list icon). Tasks with due dates appear on their due day as colored chips.',
        example: 'You have 3 tasks due Monday, 1 on Wednesday, 2 on Friday — switch to Calendar to see the week at a glance and spot any overloaded days.',
      },
      {
        title: 'Completed tasks on past dates',
        description: 'Completed tasks stay visible on the date they were due, shown with a strikethrough. This gives you a history of what you finished and when.',
        example: 'Completed "Submit report" on Aug 18 → it stays on Aug 18 in the calendar with a strikethrough so you can see your work history.',
      },
      {
        title: 'Future scheduled tasks',
        description: 'Non-recurring tasks due in the future appear on their dates with a dashed outline, distinguishing them from tasks due today or in the past.',
        example: '"Doctor appointment" due Aug 30 appears on Aug 30 with a dashed chip — clearly scheduled but not yet active.',
      },
      {
        title: 'Daily recurring tasks hidden from future dates',
        description: 'Daily recurring tasks are hidden from future calendar dates to avoid visual clutter — every day would otherwise show the same repeating task. They appear on today\'s date and each day as it arrives.',
        example: '"Read 10 pages" is a daily task. The calendar shows it on today only, not on every future date, keeping the view clean.',
      },
      {
        title: 'Open a task from the calendar',
        description: 'Click any task chip on the calendar to open its detail modal and edit it.',
        example: 'Click "Team meeting" on Thursday → modal opens → reschedule it to Friday by changing the due date.',
      },
    ],
  },
  {
    heading: 'Statistics',
    icon: 'M3 17l5-5 4 4 5-6 4 3',
    color: 'text-amber-500',
    items: [
      {
        title: 'Open Statistics',
        description: 'Click Statistics in the sidebar. The modal shows completion trends, total focus time logged, tasks by priority, and a daily activity heatmap.',
        example: 'End of the week: open Statistics → see you completed 14 tasks, logged 4h 20m of focus time, and your most productive day was Tuesday.',
      },
    ],
  },
  {
    heading: 'Import & Export',
    icon: 'M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z',
    color: 'text-teal-500',
    items: [
      {
        title: 'Export tasks',
        description: 'Click the export icon in the toolbar. Choose JSON (full fidelity — all fields, subtasks, recurrence) or CSV (opens in Excel / Google Sheets).',
        example: 'Before switching laptops: export JSON → copy file to new machine → import it. All 80 tasks restored in 10 seconds.',
      },
      {
        title: 'Import tasks',
        description: 'Click the import icon in the toolbar and pick a .json or .csv file. Imported tasks are merged with your existing list — nothing is overwritten.',
        example: 'A teammate shares their task template as a CSV. Import it → their task structure appears in your Inbox ready to use.',
      },
    ],
  },
  {
    heading: 'Customisation',
    icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    color: 'text-pink-500',
    items: [
      {
        title: 'Accent color',
        description: 'Click any colored circle in the Accent color section of the sidebar. Buttons, highlights, progress bars, and active states all update immediately.',
        example: 'Switch from the default purple to Rose for a warmer feel, or Emerald if you want a productivity-focused green theme.',
      },
      {
        title: 'Dark / Light mode',
        description: 'Click the sun ☀ or moon 🌙 icon at the top-right of the sidebar to toggle between dark and light themes.',
        example: 'Working late? Switch to dark mode to reduce eye strain. Presenting on a projector? Switch to light for better contrast.',
      },
      {
        title: 'Alert sound settings',
        description: 'Expand "Alert Sound" in the sidebar. Use the volume slider (0–100%), duration slider (how long the sound plays), and optionally upload your own sound file.',
        example: 'In an open office: volume 20%, short 2-second chime. Working alone at home: volume 70%, 5-second alarm to make sure you notice.',
      },
    ],
  },
  {
    heading: 'Account & Sync',
    icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z',
    color: 'text-indigo-500',
    items: [
      {
        title: 'Sign in for cloud sync',
        description: 'Click Sign in at the bottom of the sidebar. Create a free account with your email. Tasks sync instantly across every device you\'re signed in on.',
        example: 'Add "Buy birthday gift" on your phone during lunch → open TaskFlow on your laptop in the afternoon → the task is already there.',
      },
      {
        title: 'Guest mode',
        description: 'Use TaskFlow without creating an account. All tasks are saved in your browser\'s local storage. Clearing your browser data or switching devices will lose them.',
        example: 'Great for trying TaskFlow before committing. If you later create an account, sign in and import your exported JSON to move your tasks to the cloud.',
      },
      {
        title: 'Sign out',
        description: 'Click the → sign-out arrow icon next to your email at the bottom of the sidebar.',
        example: 'Finished using TaskFlow on a shared computer? Sign out so your tasks aren\'t visible to the next person.',
      },
    ],
  },
  {
    heading: 'Keyboard Shortcuts',
    icon: 'M4 6h16M4 10h16M4 14h16',
    color: 'text-gray-500',
    items: [
      {
        title: 'n — New task',
        description: 'Press n from anywhere on the page to jump the cursor straight into the task input — even if you\'re in the middle of reviewing your list.',
        example: 'Browsing your task list and think of something new → press n → type → Enter. Never leaves the keyboard.',
      },
      {
        title: 'Enter — Submit',
        description: 'With the task input focused, press Enter to add the task immediately. No need to click the Add button.',
        example: '"Pick up dry cleaning" → Enter → "Call bank" → Enter → "Email Jake" → Enter. Three tasks added without touching the mouse.',
      },
      {
        title: 'Escape — Close / Clear',
        description: 'Closes the open modal or Focus Mode, and clears the search bar if it\'s active.',
        example: 'Opened the wrong task modal by accident? Press Esc — closed, no click needed. Search bar has text? Esc clears it.',
      },
      {
        title: 'Space — Play / Pause timer',
        description: 'While Focus Mode is open, Space bar toggles the timer between running and paused.',
        example: 'Phone rings during a focus session → press Space to pause the countdown → answer the call → press Space again to resume.',
      },
    ],
  },
]

function ExampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/30 rounded px-1.5 py-0.5 mr-1.5 flex-shrink-0 leading-none align-middle">
      <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
        <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Try it
    </span>
  )
}

export default function HelpModal({ onClose, onReplayTour }: HelpModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)

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

  function scrollToSection(heading: string) {
    const el = document.getElementById(`help-${heading.replace(/\s+/g, '-').toLowerCase()}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(heading)
  }

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
            <div className="w-8 h-8 rounded-lg bg-accent-100 dark:bg-accent-900/50 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="none" className="w-4.5 h-4.5 text-accent-600 dark:text-accent-400" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 7a2 2 0 0 1 1.73 3C11 11 10 11.5 10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="10" cy="15.5" r="0.8" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">Help & Features</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Click any section to jump to it</p>
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

        {/* Quick-nav pills */}
        <div className="flex gap-1.5 px-6 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 flex-wrap">
          {SECTIONS.map((s) => (
            <button
              key={s.heading}
              type="button"
              onClick={() => scrollToSection(s.heading)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                activeSection === s.heading
                  ? 'bg-accent-600 border-accent-600 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400'
              }`}
            >
              {s.heading}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.heading}
              id={`help-${section.heading.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {/* Section heading */}
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" fill="none" className={`w-4 h-4 flex-shrink-0 ${section.color}`} aria-hidden="true">
                  <path d={section.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                  {section.heading}
                </h3>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 overflow-hidden"
                  >
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.title}</p>
                      {item.shortcut && (
                        <kbd className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm rounded px-1.5 py-0.5 font-mono">
                          {item.shortcut}
                        </kbd>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-3.5 pb-2.5 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Example */}
                    {item.example && (
                      <div className="mx-3.5 mb-3 px-3 py-2 rounded-lg bg-accent-50 dark:bg-accent-900/20 border border-accent-100 dark:border-accent-800/40">
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                          <ExampleBadge />
                          {item.example}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="flex items-center justify-center gap-4 pb-2">
            {onReplayTour && (
              <button
                type="button"
                onClick={onReplayTour}
                className="flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-400 hover:underline focus:outline-none focus:ring-2 focus:ring-accent-500 rounded"
              >
                <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3" aria-hidden="true">
                  <path d="M2 7a5 5 0 1 0 1-2.9M2 4v3H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Replay tour
              </button>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-600">
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono">
                Esc
              </kbd>{' '}
              to close
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
