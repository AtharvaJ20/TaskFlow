interface WelcomeTourProps {
  step: number
  onNext: () => void
  onSkip: () => void
}

const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" aria-hidden="true">
        <circle cx="40" cy="40" r="36" fill="rgb(var(--ca-500) / 0.15)" />
        <circle cx="40" cy="40" r="28" fill="rgb(var(--ca-500) / 0.2)" />
        <path d="M26 40l9 9 19-19" stroke="rgb(var(--ca-500))" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="62" cy="18" r="4" fill="rgb(var(--ca-400))" opacity="0.7" />
        <circle cx="18" cy="22" r="3" fill="rgb(var(--ca-400))" opacity="0.5" />
        <circle cx="66" cy="58" r="3" fill="rgb(var(--ca-400))" opacity="0.6" />
      </svg>
    ),
    title: 'Welcome to TaskFlow',
    body: 'Your personal task manager — fast, offline-first, and completely private. Everything stays on your device. Let\'s take a quick look around.',
    cta: 'Show me around',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" aria-hidden="true">
        <rect x="12" y="20" width="56" height="42" rx="8" fill="rgb(var(--ca-500) / 0.12)" stroke="rgb(var(--ca-500))" strokeWidth="2" />
        <path d="M22 36h36M22 46h24" stroke="rgb(var(--ca-400))" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="58" cy="56" r="12" fill="rgb(var(--ca-600))" />
        <path d="M54 56h8M58 52v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 28h20" stroke="rgb(var(--ca-300))" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
    title: 'Capture tasks instantly',
    body: 'Press N anywhere to jump to the task input. Set priority (Low / Medium / High), a due date, and assign to a list — all before you hit Enter.',
    cta: 'Next',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" aria-hidden="true">
        <rect x="10" y="12" width="26" height="32" rx="5" fill="rgb(var(--ca-500) / 0.15)" stroke="rgb(var(--ca-500))" strokeWidth="1.8" />
        <rect x="44" y="12" width="26" height="20" rx="5" fill="rgb(var(--ca-500) / 0.08)" stroke="rgb(var(--ca-400))" strokeWidth="1.8" />
        <rect x="44" y="40" width="26" height="20" rx="5" fill="rgb(var(--ca-500) / 0.08)" stroke="rgb(var(--ca-400))" strokeWidth="1.8" />
        <path d="M17 24h12M17 30h8" stroke="rgb(var(--ca-400))" strokeWidth="2" strokeLinecap="round" />
        <path d="M51 20h12M51 26h8" stroke="rgb(var(--ca-300))" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M51 48h12M51 54h6" stroke="rgb(var(--ca-300))" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="44" r="3" fill="rgb(var(--ca-500))" />
        <path d="M17 36v22" stroke="rgb(var(--ca-500))" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
    title: 'Organize with Lists & Tags',
    body: 'Create Lists like Work, Shopping, or Personal from the sidebar. Add #tags to tasks for cross-cutting topics — click any tag to filter instantly.',
    cta: 'Next',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" aria-hidden="true">
        <circle cx="40" cy="40" r="28" fill="rgb(var(--ca-500) / 0.1)" stroke="rgb(var(--ca-500))" strokeWidth="2" strokeDasharray="5 3" />
        <circle cx="40" cy="40" r="18" fill="rgb(var(--ca-500) / 0.15)" />
        <circle cx="40" cy="40" r="4" fill="rgb(var(--ca-500))" />
        <path d="M40 12v6M40 62v6M12 40h6M62 40h6" stroke="rgb(var(--ca-500))" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 24v16" stroke="rgb(var(--ca-400))" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 40l10 6" stroke="rgb(var(--ca-300))" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: 'Focus Mode & Pomodoro',
    body: 'Hover a task and click the ⊕ icon to open Focus Mode — a full-screen Pomodoro timer for that task. Work sessions and breaks auto-switch, with a notification when time is up.',
    cta: 'Next',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" aria-hidden="true">
        {/* Progress ring */}
        <circle cx="40" cy="38" r="22" stroke="rgb(var(--ca-500) / 0.2)" strokeWidth="5" />
        <circle cx="40" cy="38" r="22" stroke="rgb(var(--ca-500))" strokeWidth="5" strokeLinecap="round"
          strokeDasharray="138" strokeDashoffset="48" transform="rotate(-90 40 38)" />
        {/* Flag at top of ring */}
        <path d="M40 16v-6M40 10h8l-3 4 3 4h-8" stroke="rgb(var(--ca-400))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Centre pct */}
        <text x="40" y="35" textAnchor="middle" fontSize="10" fontWeight="700" fill="rgb(var(--ca-500))">65%</text>
        <text x="40" y="45" textAnchor="middle" fontSize="6" fill="rgb(var(--ca-400))">on track</text>
        {/* Small task ticks below */}
        <rect x="8" y="64" width="28" height="10" rx="3" fill="rgb(var(--ca-500) / 0.12)" stroke="rgb(var(--ca-400))" strokeWidth="1.2" />
        <path d="M13 69l2.5 2.5 5-5" stroke="rgb(var(--ca-500))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 69h8" stroke="rgb(var(--ca-300))" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="44" y="64" width="28" height="10" rx="3" fill="rgb(var(--ca-500) / 0.06)" stroke="rgb(var(--ca-300))" strokeWidth="1.2" strokeDasharray="3 2" />
        <path d="M49 69h18" stroke="rgb(var(--ca-300))" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
    title: 'Goals — big-picture progress',
    body: 'Create task-based goals to track a project over its deadline, or metric goals to log numbers like weight, pages read, or savings. Progress updates automatically as you complete tasks or log entries.',
    cta: 'Next',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20" aria-hidden="true">
        <rect x="10" y="52" width="12" height="18" rx="3" fill="rgb(var(--ca-400))" opacity="0.5" />
        <rect x="28" y="36" width="12" height="34" rx="3" fill="rgb(var(--ca-500))" opacity="0.7" />
        <rect x="46" y="24" width="12" height="46" rx="3" fill="rgb(var(--ca-600))" />
        <path d="M10 68h60" stroke="rgb(var(--ca-300))" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <path d="M14 50l18-16 18 10 14-20" stroke="rgb(var(--ca-400))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="50" r="3" fill="rgb(var(--ca-400))" />
        <circle cx="32" cy="34" r="3" fill="rgb(var(--ca-400))" />
        <circle cx="50" cy="44" r="3" fill="rgb(var(--ca-400))" />
        <circle cx="64" cy="24" r="3" fill="rgb(var(--ca-400))" />
      </svg>
    ),
    title: 'Track your progress',
    body: 'Open Statistics from the sidebar to see your completion rate, streaks, and productivity by day. The progress bar at the top updates in real time as you check tasks off.',
    cta: 'Get started',
  },
]

export default function WelcomeTour({ step, onNext, onSkip }: WelcomeTourProps) {
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Tour step ${step + 1} of ${STEPS.length}: ${current.title}`}
    >
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center p-8 gap-5">

        {/* Skip */}
        {!isLast && (
          <button
            type="button"
            onClick={onSkip}
            className="absolute top-4 right-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 rounded px-2 py-1"
          >
            Skip tour
          </button>
        )}

        {/* Illustration */}
        <div className="mt-2">{current.icon}</div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{current.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{current.body}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 h-2 bg-accent-500'
                  : i < step
                    ? 'w-2 h-2 bg-accent-300'
                    : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onNext}
          className="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {current.cta}
        </button>
      </div>
    </div>
  )
}
