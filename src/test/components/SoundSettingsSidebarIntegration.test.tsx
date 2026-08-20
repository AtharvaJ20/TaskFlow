/**
 * Integration tests for the Alert Sound settings as wired up in App's sidebar:
 * handleSoundChange → saveSoundSettings → localStorage, saveError propagation,
 * and the collapsible toggle pattern.
 *
 * These tests render SoundSettingsPanel with the same wrapper logic App uses,
 * without needing to mount the full App (which requires Supabase).
 */
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SoundSettingsPanel from '../../components/SoundSettingsPanel'
import {
  type SoundSettings,
  DEFAULT_SOUND,
  loadSoundSettings,
  loadSoundSettingsFull,
  saveSoundSettings,
} from '../../utils/soundSettings'

const SOUND_KEY = 'taskflow-sound-settings'
const SOUND_AUDIO_KEY = 'taskflow-sound-settings_audio'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

// ─── Wrapper that replicates App's handleSoundChange logic ─────────────────

function SidebarWrapper({ initialSettings = DEFAULT_SOUND }: { initialSettings?: SoundSettings }) {
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(initialSettings)
  const [soundSaveError, setSoundSaveError] = useState<string | null>(null)
  const [open, setOpen] = useState(true)

  function handleSoundChange(s: SoundSettings) {
    setSoundSettings(s)
    setSoundSaveError(null)
    if (!saveSoundSettings(s)) {
      setSoundSaveError("Couldn't save — device storage is full.")
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Alert Sound settings"
      >
        Alert Sound
      </button>
      {open && (
        <SoundSettingsPanel
          settings={soundSettings}
          onChange={handleSoundChange}
          saveError={soundSaveError}
        />
      )}
    </div>
  )
}

// ─── Toggle (expand / collapse) ─────────────────────────────────────────────

describe('Sidebar – Alert Sound toggle', () => {
  it('renders expanded with aria-expanded=true', () => {
    render(<SidebarWrapper />)
    expect(screen.getByRole('button', { name: /alert sound settings/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('panel is visible when open', () => {
    render(<SidebarWrapper />)
    expect(screen.getByLabelText(/alert volume/i)).toBeInTheDocument()
  })

  it('collapses when the toggle is clicked', async () => {
    render(<SidebarWrapper />)
    await userEvent.click(screen.getByRole('button', { name: /alert sound settings/i }))
    expect(screen.queryByLabelText(/alert volume/i)).not.toBeInTheDocument()
  })

  it('sets aria-expanded=false when collapsed', async () => {
    render(<SidebarWrapper />)
    await userEvent.click(screen.getByRole('button', { name: /alert sound settings/i }))
    expect(screen.getByRole('button', { name: /alert sound settings/i })).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands again when toggled a second time', async () => {
    render(<SidebarWrapper />)
    const btn = screen.getByRole('button', { name: /alert sound settings/i })
    await userEvent.click(btn)
    await userEvent.click(btn)
    expect(screen.getByLabelText(/alert volume/i)).toBeInTheDocument()
  })
})

// ─── localStorage persistence via handleSoundChange ───────────────────────

describe('Sidebar – settings persist to localStorage', () => {
  it('saves volume to localStorage when slider changes', () => {
    render(<SidebarWrapper />)
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '60' } })
    const stored = JSON.parse(localStorage.getItem(SOUND_KEY) ?? '{}')
    expect(stored.volume).toBeCloseTo(0.6, 2)
  })

  it('saves durationSecs to localStorage when slider changes', () => {
    render(<SidebarWrapper />)
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '20' } })
    const stored = JSON.parse(localStorage.getItem(SOUND_KEY) ?? '{}')
    expect(stored.durationSecs).toBe(20)
  })

  it('loadSoundSettings reads back the saved volume', () => {
    render(<SidebarWrapper />)
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '30' } })
    expect(loadSoundSettings().volume).toBeCloseTo(0.3, 2)
  })

  it('loadSoundSettings reads back the saved duration', () => {
    render(<SidebarWrapper />)
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '7' } })
    expect(loadSoundSettings().durationSecs).toBe(7)
  })

  it('saves custom audio B64 to the audio key', () => {
    const withAudio: SoundSettings = {
      ...DEFAULT_SOUND,
      customAudioB64: 'data:audio/mpeg;base64,dGVzdA==',
      customAudioName: 'song.mp3',
    }
    render(<SidebarWrapper initialSettings={withAudio} />)
    // Trigger a volume change to kick off a save with audio present
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '50' } })
    expect(localStorage.getItem(SOUND_AUDIO_KEY)).toBe('data:audio/mpeg;base64,dGVzdA==')
  })

  it('removing custom audio clears the audio key from localStorage', async () => {
    const withAudio: SoundSettings = {
      ...DEFAULT_SOUND,
      customAudioB64: 'data:audio/mpeg;base64,dGVzdA==',
      customAudioName: 'song.mp3',
    }
    // Pre-populate localStorage
    localStorage.setItem(SOUND_AUDIO_KEY, 'data:audio/mpeg;base64,dGVzdA==')
    render(<SidebarWrapper initialSettings={withAudio} />)
    await userEvent.click(screen.getByRole('button', { name: /remove custom sound/i }))
    expect(localStorage.getItem(SOUND_AUDIO_KEY)).toBeNull()
  })
})

// ─── loadSoundSettingsFull round-trip (what FocusMode reads) ──────────────

describe('Sidebar → FocusMode round-trip', () => {
  it('loadSoundSettingsFull returns the volume set via the sidebar', () => {
    render(<SidebarWrapper />)
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '80' } })
    expect(loadSoundSettingsFull().volume).toBeCloseTo(0.8, 2)
  })

  it('loadSoundSettingsFull returns the custom audio set via the sidebar', () => {
    const withAudio: SoundSettings = {
      ...DEFAULT_SOUND,
      customAudioB64: 'data:audio/mpeg;base64,dGVzdA==',
      customAudioName: 'track.mp3',
    }
    render(<SidebarWrapper initialSettings={withAudio} />)
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '50' } })
    expect(loadSoundSettingsFull().customAudioB64).toBe('data:audio/mpeg;base64,dGVzdA==')
  })
})

// ─── saveError propagation ─────────────────────────────────────────────────

describe('Sidebar – saveError surfaces to panel', () => {
  it('shows saveError message in the panel when localStorage is full', () => {
    // Throw QuotaExceededError on every setItem so saveSoundSettings returns false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
    })

    render(<SidebarWrapper />)
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '40' } })

    expect(screen.getByRole('alert')).toHaveTextContent(/device storage is full/i)

    vi.restoreAllMocks()
  })
})

// ─── Accessibility ─────────────────────────────────────────────────────────

describe('Sidebar – Alert Sound accessibility', () => {
  it('toggle button has aria-label', () => {
    render(<SidebarWrapper />)
    expect(screen.getByRole('button', { name: /alert sound settings/i })).toBeInTheDocument()
  })

  it('Test button has descriptive accessible name', () => {
    render(<SidebarWrapper />)
    expect(screen.getByRole('button', { name: /test alert sound/i })).toBeInTheDocument()
  })

  it('volume slider is associated with its label via htmlFor', () => {
    render(<SidebarWrapper />)
    const slider = document.getElementById('sound-volume')
    expect(slider).not.toBeNull()
    const label = document.querySelector('label[for="sound-volume"]')
    expect(label).not.toBeNull()
  })

  it('duration slider is associated with its label via htmlFor', () => {
    render(<SidebarWrapper />)
    const slider = document.getElementById('sound-duration')
    expect(slider).not.toBeNull()
    const label = document.querySelector('label[for="sound-duration"]')
    expect(label).not.toBeNull()
  })
})
