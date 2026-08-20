interface HeaderProps {
  totalCount: number
  completedCount: number
  activeCount: number
  isDark: boolean
  onToggleTheme: () => void
  onMenuClick: () => void
}

export default function Header({ totalCount, completedCount, activeCount, isDark, onToggleTheme, onMenuClick }: HeaderProps) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <header className="sticky top-0 z-10 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-[640px] flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {/* Hamburger menu — opens mobile sidebar */}
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="w-2.5 h-2.5 rounded-full bg-accent-500 inline-block" />
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">TaskFlow</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-accent-50 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 border border-accent-200 dark:border-accent-700">
            {activeCount} active
            {totalCount > 0 && (
              <span className="text-accent-400 dark:text-accent-500 font-normal">
                · {completedCount}/{totalCount}
              </span>
            )}
          </span>

          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? (
              /* Sun icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {totalCount > 0 && (
        <div className="h-0.5 w-full bg-gray-100 dark:bg-gray-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${completedCount} of ${totalCount} tasks completed`}>
          <div
            className="h-full bg-accent-500 motion-safe:transition-all motion-safe:duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </header>
  )
}
