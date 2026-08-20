import { useRef, useState } from 'react'
import { playAlert } from '../utils/soundSettings'
import type { SoundSettings } from '../utils/soundSettings'

interface SoundSettingsPanelProps {
  settings: SoundSettings
  onChange: (s: SoundSettings) => void
  saveError: string | null
}

export default function SoundSettingsPanel({ settings, onChange, saveError }: SoundSettingsPanelProps) {
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

  const volumePct = Math.round(settings.volume * 100)

  return (
    <div className="flex flex-col gap-4">
      {/* Volume */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="sound-volume" className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M3 6H1v4h2l4 3V3L3 6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              {volumePct > 0 && <path d="M11 5.5a3.5 3.5 0 0 1 0 5M9 7a1.5 1.5 0 0 1 0 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
            </svg>
            Volume
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{volumePct}%</span>
        </div>
        <input
          id="sound-volume"
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
          <label htmlFor="sound-duration" className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Duration
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{settings.durationSecs}s</span>
        </div>
        <input
          id="sound-duration"
          type="range"
          min={1}
          max={30}
          value={settings.durationSecs}
          onChange={handleDurationChange}
          className="w-full accent-accent-500 h-1.5 rounded-full cursor-pointer"
          aria-label="Alert duration in seconds"
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600">
          <span>1s</span>
          <span>30s</span>
        </div>
      </div>

      {/* Custom audio */}
      <div className="flex flex-col gap-2">
        {settings.customAudioName ? (
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-accent-500 flex-shrink-0" aria-hidden="true">
              <path d="M12 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 8l1.5 1.5L10 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{settings.customAudioName}</span>
            <button
              type="button"
              onClick={clearCustomAudio}
              aria-label="Remove custom sound"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">Default melody</p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
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
            onClick={() => playAlert('work', settings)}
            aria-label="Test alert sound"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <svg viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3" aria-hidden="true">
              <path d="M3 2l9 5-9 5V2z" />
            </svg>
            Test
          </button>
        </div>

        {uploadError && (
          <p className="text-xs text-red-500 dark:text-red-400" role="alert">{uploadError}</p>
        )}
        {saveError && !uploadError && (
          <p className="text-xs text-amber-600 dark:text-amber-400" role="alert">{saveError}</p>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-600">Max 3 MB · MP3, AAC, WAV, OGG</p>
      </div>
    </div>
  )
}
