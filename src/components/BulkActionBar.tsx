interface BulkActionBarProps {
  count: number
  onCompleteAll: () => void
  onDeleteAll: () => void
  onClear: () => void
}

export default function BulkActionBar({ count, onCompleteAll, onDeleteAll, onClear }: BulkActionBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm motion-safe:animate-snack-up"
    >
      <span className="font-medium text-gray-300 mr-1">{count} selected</span>

      <button
        type="button"
        onClick={onCompleteAll}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium"
      >
        <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
          <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Complete
      </button>

      <button
        type="button"
        onClick={onDeleteAll}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 transition-colors font-medium"
      >
        <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
          <path d="M2.5 3.5h9M5.5 3.5V2.5h3v1M4.5 3.5l.5 7h4l.5-7" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Delete
      </button>

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="ml-1 text-gray-400 hover:text-white transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
