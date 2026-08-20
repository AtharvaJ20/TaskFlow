import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task } from '../types/task'
import {
  type SoundSettings,
  loadSoundSettingsFull,
  saveSoundSettings,
  playAlert,
} from '../utils/soundSettings'

interface FocusModeProps {
  task: Task
  onClose: () => void
  onComplete: (id: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onLogTime: (taskId: string, seconds: number) => void
}

const DURATIONS_KEY = 'taskflow-timer-durations'
const DEFAULT_WORK_MINS = 25
const DEFAULT_BREAK_MINS = 5

// ─── Timer duration settings ───────────────────────────────────────────────

function loadSettings(taskId: string) {
  try {
    const raw = localStorage.getItem(DURATIONS_KEY)
    const map = raw ? JSON.parse(raw) : {}
    const entry = map[taskId]
    if (!entry) return { workMins: DEFAULT_WORK_MINS, breakMins: DEFAULT_BREAK_MINS }
    return {
      workMins: Number(entry.workMins) || DEFAULT_WORK_MINS,
      breakMins: Number(entry.breakMins) || DEFAULT_BREAK_MINS,
    }
  } catch {
    return { workMins: DEFAULT_WORK_MINS, breakMins: DEFAULT_BREAK_MINS }
  }
}

function persistSettings(taskId: string, workMins: number, breakMins: number) {
  try {
    const raw = localStorage.getItem(DURATIONS_KEY)
    const map = raw ? JSON.parse(raw) : {}
    map[taskId] = { workMins, breakMins }
    localStorage.setItem(DURATIONS_KEY, JSON.stringify(map))
  } catch {}
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined') return
  const fire = () => {
    try { new Notification(title, { body, icon: '/icon-192.svg', silent: true }) } catch {}
  }
  if (Notification.permission === 'granted') fire()
  else if (Notification.permission === 'default') Notification.requestPermission().then(p => { if (p === 'granted') fire() })
}

function clampMins(v: number) {
  return Math.max(1, Math.min(99, Math.round(v)))
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

// ─── Duration chip ─────────────────────────────────────────────────────────

function DurationChip({
  label, value, color, disabled, onSave,
}: {
  label: string; value: number; color: 'accent' | 'emerald'; disabled: boolean; onSave: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  function open() {
    if (disabled) return
    setDraft(value)
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 0)
  }

  function commit() {
    const v = clampMins(draft || value)
    onSave(v)
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  const ring = color === 'accent'
    ? 'border-accent-600/50 bg-accent-600/10 text-accent-300'
    : 'border-emerald-600/50 bg-emerald-600/10 text-emerald-300'
  const inputRing = color === 'accent' ? 'focus:ring-accent-500' : 'focus:ring-emerald-500'
  const btn = color === 'accent' ? 'bg-accent-600 hover:bg-accent-500' : 'bg-emerald-600 hover:bg-emerald-500'

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400">{label}</span>
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={99}
          value={draft}
          onChange={e => setDraft(Number(e.target.value))}
          onKeyDown={handleKey}
          onBlur={commit}
          className={`w-14 bg-gray-800 border border-gray-600 rounded-lg px-2 py-0.5 text-white text-sm text-center focus:outline-none focus:ring-2 ${inputRing}`}
        />
        <span className="text-xs text-gray-400">min</span>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); commit() }}
          className={`px-2 py-0.5 rounded-md text-xs text-white font-medium ${btn} transition-colors`}
        >
          Set
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={disabled}
      title={disabled ? 'Pause the timer to edit' : `Click to change ${label.toLowerCase()} duration`}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${ring} ${
        disabled ? 'opacity-40 cursor-default' : 'cursor-pointer hover:opacity-80'
      }`}
    >
      {label}
      <span className="font-bold">{value}m</span>
      {!disabled && (
        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 opacity-60" aria-hidden="true">
          <path d="M8.5 1.5l2 2-6 6H2.5v-2l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ─── Sound settings panel ──────────────────────────────────────────────────

function SoundSettingsPanel({
  settings,
  onChange,
  saveError,
}: {
  settings: SoundSettings
  onChange: (s: SoundSettings) => void
  saveError: string | null
}) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...settings, volume: Number(e.target.value) / 100 })
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...settings, durationSecs: Number(e.target.value) })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please choose an audio file (MP3, AAC, WAV, OGG).')
      e.target.value = ''
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('File too large (max 3 MB). Choose a shorter clip.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      onChange({ ...settings, customAudioB64: result, customAudioName: file.name })
    }
    reader.onerror = () => setUploadError('Could not read file.')
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function clearCustomAudio() {
    onChange({ ...settings, customAudioB64: null, customAudioName: null })
  }

  function preview() {
    playAlert('work', settings)
  }

  const volumePct = Math.round(settings.volume * 100)

  return (
    <div className="w-full bg-gray-900 rounded-2xl p-4 flex flex-col gap-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alert Sound</p>

      {/* Volume */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-400 flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M3 6H1v4h2l4 3V3L3 6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              {volumePct > 0 && <path d="M11 5.5a3.5 3.5 0 0 1 0 5M9 7a1.5 1.5 0 0 1 0 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
            </svg>
            Volume
          </label>
          <span className="text-xs text-gray-300 tabular-nums">{volumePct}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volumePct}
          onChange={handleVolumeChange}
          className="w-full accent-accent-500 h-1.5 rounded-full cursor-pointer"
          aria-label="Alert volume"
        />
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-400 flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Alert duration
          </label>
          <span className="text-xs text-gray-300 tabular-nums">{settings.durationSecs}s</span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          value={settings.durationSecs}
          onChange={handleDurationChange}
          className="w-full accent-accent-500 h-1.5 rounded-full cursor-pointer"
          aria-label="Alert duration in seconds"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>1s</span>
          <span>30s</span>
        </div>
      </div>

      {/* Custom audio */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M13 6l-5-4-5 4v8h4v-3h2v3h4V6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="8" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          Alert sound
        </p>

        {settings.customAudioName ? (
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-accent-400 flex-shrink-0" aria-hidden="true">
              <path d="M12 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 8l1.5 1.5L10 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-300 truncate flex-1">{settings.customAudioName}</span>
            <button
              type="button"
              onClick={clearCustomAudio}
              aria-label="Remove custom sound"
              className="text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">Default melody</p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {settings.customAudioName ? 'Change song' : 'Choose from device'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={preview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <svg viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3" aria-hidden="true">
              <path d="M3 2l9 5-9 5V2z" />
            </svg>
            Test
          </button>
        </div>

        {uploadError && (
          <p className="text-xs text-red-400" role="alert">{uploadError}</p>
        )}
        {saveError && !uploadError && (
          <p className="text-xs text-amber-400" role="alert">{saveError}</p>
        )}

        <p className="text-xs text-gray-600">Max 3 MB · MP3, AAC, WAV, OGG</p>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function FocusMode({ task, onClose, onComplete, onToggleSubtask, onLogTime }: FocusModeProps) {
  const initial = loadSettings(task.id)
  const [workMins, setWorkMins] = useState(initial.workMins)
  const [breakMins, setBreakMins] = useState(initial.breakMins)

  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [secs, setSecs] = useState(initial.workMins * 60)
  const [running, setRunning] = useState(false)
  const [flash, setFlash] = useState(false)
  const [sessionSecs, setSessionSecs] = useState(0)
  const [showSound, setShowSound] = useState(false)
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(loadSoundSettingsFull)
  const [tapToPlay, setTapToPlay] = useState<'work' | 'break' | null>(null)
  const [soundSaveError, setSoundSaveError] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const modeRef = useRef<'work' | 'break'>('work')
  const workSecsRef = useRef(initial.workMins * 60)
  const breakSecsRef = useRef(initial.breakMins * 60)
  const onLogTimeRef = useRef(onLogTime)
  const soundSettingsRef = useRef(soundSettings)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { workSecsRef.current = workMins * 60 }, [workMins])
  useEffect(() => { breakSecsRef.current = breakMins * 60 }, [breakMins])
  useEffect(() => { onLogTimeRef.current = onLogTime }, [onLogTime])
  useEffect(() => { soundSettingsRef.current = soundSettings }, [soundSettings])

  function handleSoundChange(s: SoundSettings) {
    setSoundSettings(s)
    setSoundSaveError(null)
    if (!saveSoundSettings(s)) {
      setSoundSaveError("Couldn't save — device storage is full.")
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === ' ' && e.target === document.body) { e.preventDefault(); setRunning(r => !r) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            const currentMode = modeRef.current
            const nextMode = currentMode === 'work' ? 'break' : 'work'
            setMode(nextMode)
            setSecs(nextMode === 'work' ? workSecsRef.current : breakSecsRef.current)
            playAlert(currentMode === 'work' ? 'work' : 'break', soundSettingsRef.current, () => {
              setTapToPlay(currentMode === 'work' ? 'work' : 'break')
            })
            notify(
              currentMode === 'work' ? '⏰ Focus session complete!' : '⏰ Break over!',
              currentMode === 'work'
                ? `Great work on "${task.title}". Time for a 5-minute break.`
                : 'Ready for the next focus session?',
            )
            setFlash(true)
            setTimeout(() => setFlash(false), 1200)
            if (currentMode === 'work') {
              const logged = workSecsRef.current
              onLogTimeRef.current(task.id, logged)
              setSessionSecs(s => s + logged)
            }
            return 0
          }
          if (modeRef.current === 'work') {
            setSessionSecs(s => s + 1)
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, task.title, task.id])

  const switchMode = useCallback((m: 'work' | 'break') => {
    setRunning(false)
    setMode(m)
    setSecs(m === 'work' ? workSecsRef.current : breakSecsRef.current)
  }, [])

  const reset = useCallback(() => {
    setRunning(false)
    setSecs(modeRef.current === 'work' ? workSecsRef.current : breakSecsRef.current)
  }, [])

  function handleWorkSave(v: number) {
    setWorkMins(v)
    workSecsRef.current = v * 60
    persistSettings(task.id, v, breakMins)
    if (!running && modeRef.current === 'work') setSecs(v * 60)
  }

  function handleBreakSave(v: number) {
    setBreakMins(v)
    breakSecsRef.current = v * 60
    persistSettings(task.id, workMins, v)
    if (!running && modeRef.current === 'break') setSecs(v * 60)
  }

  const totalSecs = mode === 'work' ? workMins * 60 : breakMins * 60
  const elapsed = totalSecs - secs
  const pct = totalSecs > 0 ? (elapsed / totalSecs) * 100 : 0
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = circ - (pct / 100) * circ
  const subtasks = task.subtasks ?? []
  const subtasksDone = subtasks.filter(s => s.completed).length

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
    >
      {flash && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: mode === 'break' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', transition: 'opacity 0.6s' }}
          aria-hidden="true"
        />
      )}

      {/* Tap-to-play fallback: shown when the browser blocked autoplay (mobile locked screen) */}
      {tapToPlay && (
        <div className="absolute top-0 inset-x-0 flex justify-center pt-4 px-4 z-10">
          <button
            type="button"
            onClick={() => {
              playAlert(tapToPlay, soundSettingsRef.current)
              setTapToPlay(null)
            }}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-gray-950 font-semibold text-sm shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-300"
            aria-live="assertive"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
              <path d="M4 8a6 6 0 0 1 12 0v4l1.5 2H2.5L4 12V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Tap to hear alert
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 opacity-60 flex-shrink-0" aria-hidden="true">
              <path d="M12 8L4 4v8l8-4z" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit focus mode"
        className="absolute top-5 right-5 text-gray-500 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-lg p-1"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
          <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      {/* Sound settings toggle */}
      <button
        type="button"
        onClick={() => setShowSound(v => !v)}
        aria-label="Sound settings"
        title="Alert sound settings"
        className={`absolute top-5 right-14 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-lg p-1 ${showSound ? 'text-accent-400' : 'text-gray-500 hover:text-gray-200'}`}
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
          <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="w-full max-w-md flex flex-col items-center gap-7 overflow-y-auto max-h-screen py-16">

        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-full p-1">
          <button
            type="button"
            onClick={() => switchMode('work')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none ${mode === 'work' ? 'bg-accent-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => switchMode('break')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none ${mode === 'break' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Break
          </button>
        </div>

        {/* Timer ring */}
        <div className="relative flex items-center justify-center">
          <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgb(55 65 81)" strokeWidth="6" />
            <circle
              cx="70" cy="70" r={r}
              fill="none"
              stroke={mode === 'work' ? 'rgb(var(--ca-500))' : '#10b981'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              transform="rotate(-90 70 70)"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-4xl font-bold text-white tabular-nums">{fmt(secs)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{mode === 'work' ? 'focus' : 'break'}</div>
          </div>
        </div>

        {/* Duration chips */}
        <div className="flex items-center gap-3">
          <DurationChip label="Focus" value={workMins} color="accent" disabled={running} onSave={handleWorkSave} />
          <DurationChip label="Break" value={breakMins} color="emerald" disabled={running} onSave={handleBreakSave} />
        </div>

        {/* Timer controls */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={reset}
            aria-label="Reset timer"
            className="text-gray-500 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-lg p-2"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
              <path d="M4 10a6 6 0 1 0 1.5-3.9M4 6V2m0 4H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setRunning(r => !r)}
            aria-label={running ? 'Pause timer' : 'Start timer'}
            className="w-14 h-14 rounded-full bg-accent-600 hover:bg-accent-500 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            {running ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6" aria-hidden="true">
                <rect x="5" y="4" width="4" height="12" rx="1" /><rect x="11" y="4" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 ml-0.5" aria-hidden="true">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
            )}
          </button>

          <div className="w-9 h-9" aria-hidden="true" />
        </div>

        {running && (
          <p className="text-xs text-gray-600 -mt-3">Pause to edit durations</p>
        )}

        {/* Sound settings panel */}
        {showSound && (
          <SoundSettingsPanel settings={soundSettings} onChange={handleSoundChange} saveError={soundSaveError} />
        )}

        {/* Task card */}
        <div className="w-full bg-gray-900 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-semibold text-lg leading-snug">{task.title}</p>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {sessionSecs > 0 && (
                <span className="flex items-center gap-1 text-xs bg-accent-600/20 text-accent-300 px-2 py-0.5 rounded-full">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {fmtDuration(sessionSecs)} this session
                </span>
              )}
              {(task.timeLogged ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  ⏱ {fmtDuration(task.timeLogged!)} total
                </span>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-gray-400 text-sm leading-relaxed">{task.description}</p>
          )}

          {subtasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-500 font-medium">{subtasksDone}/{subtasks.length} subtasks</p>
              {subtasks.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggleSubtask(task.id, s.id)}
                  className="flex items-center gap-2.5 text-left group focus:outline-none"
                  aria-pressed={s.completed}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${s.completed ? 'bg-accent-600 border-accent-600' : 'border-gray-600 group-hover:border-accent-500'}`}>
                    {s.completed && (
                      <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm ${s.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>{s.title}</span>
                </button>
              ))}
            </div>
          )}

          {!task.completed && (
            <button
              type="button"
              onClick={() => { onComplete(task.id); onClose() }}
              className="mt-1 w-full py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              Mark complete & exit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
