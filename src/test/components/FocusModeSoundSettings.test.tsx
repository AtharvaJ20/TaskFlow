import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SoundSettingsPanel from '../../components/SoundSettingsPanel'
import type { SoundSettings } from '../../utils/soundSettings'

const SOUND_KEY = 'taskflow-sound-settings'
const SOUND_AUDIO_KEY = 'taskflow-sound-settings_audio'

const DEFAULT: SoundSettings = {
  volume: 0.75,
  durationSecs: 10,
  customAudioB64: null,
  customAudioName: null,
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

function renderPanel(overrides: Partial<SoundSettings> = {}, saveError: string | null = null) {
  const onChange = vi.fn()
  const settings: SoundSettings = { ...DEFAULT, ...overrides }
  render(<SoundSettingsPanel settings={settings} onChange={onChange} saveError={saveError} />)
  return { onChange, settings }
}

// ─── Panel renders ─────────────────────────────────────────────────────────

describe('Sound settings panel – rendering', () => {
  it('shows volume slider', () => {
    renderPanel()
    expect(screen.getByLabelText(/alert volume/i)).toBeInTheDocument()
  })

  it('shows duration slider', () => {
    renderPanel()
    expect(screen.getByLabelText(/alert duration in seconds/i)).toBeInTheDocument()
  })

  it('shows "Default melody" when no custom audio is set', () => {
    renderPanel()
    expect(screen.getByText(/default melody/i)).toBeInTheDocument()
  })
})

// ─── Volume slider ─────────────────────────────────────────────────────────

describe('Sound settings – volume', () => {
  it('reflects the volume prop (75%)', () => {
    renderPanel({ volume: 0.75 })
    const slider = screen.getByLabelText(/alert volume/i) as HTMLInputElement
    expect(slider.value).toBe('75')
  })

  it('displays the current percentage', () => {
    renderPanel({ volume: 0.75 })
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('calls onChange when the slider moves', async () => {
    const { onChange } = renderPanel({ volume: 0.75 })
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '40' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ volume: 0.4 }))
  })

  it('reflects a 20% volume prop', () => {
    renderPanel({ volume: 0.2 })
    const slider = screen.getByLabelText(/alert volume/i) as HTMLInputElement
    expect(slider.value).toBe('20')
  })

  it('calls onChange with correct fractional volume', () => {
    const { onChange } = renderPanel()
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '50' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ volume: 0.5 }))
  })
})

// ─── Duration slider ───────────────────────────────────────────────────────

describe('Sound settings – duration', () => {
  it('reflects the durationSecs prop', () => {
    renderPanel({ durationSecs: 10 })
    const slider = screen.getByLabelText(/alert duration in seconds/i) as HTMLInputElement
    expect(slider.value).toBe('10')
  })

  it('displays the current value in seconds', () => {
    renderPanel({ durationSecs: 10 })
    expect(screen.getByText('10s')).toBeInTheDocument()
  })

  it('calls onChange when duration slider moves', () => {
    const { onChange } = renderPanel()
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ durationSecs: 5 }))
  })

  it('calls onChange with durationSecs 15', () => {
    const { onChange } = renderPanel()
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ durationSecs: 15 }))
  })

  it('min boundary: calls onChange with durationSecs 1', () => {
    const { onChange } = renderPanel()
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '1' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ durationSecs: 1 }))
  })

  it('max boundary: calls onChange with durationSecs 30', () => {
    const { onChange } = renderPanel()
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '30' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ durationSecs: 30 }))
  })

  it('reflects a 20s durationSecs prop', () => {
    renderPanel({ durationSecs: 20 })
    const slider = screen.getByLabelText(/alert duration in seconds/i) as HTMLInputElement
    expect(slider.value).toBe('20')
  })
})

// ─── Custom audio upload ───────────────────────────────────────────────────

describe('Sound settings – custom audio upload', () => {
  it('shows the uploaded filename after a valid file is selected', async () => {
    const { onChange } = renderPanel()

    const OriginalFileReader = global.FileReader
    const MockFileReader = vi.fn().mockImplementation(function (this: FileReader) {
      Object.assign(this, {
        result: 'data:audio/mpeg;base64,dGVzdA==',
        readAsDataURL: vi.fn().mockImplementation(function (this: FileReader) {
          if (this.onload) {
            this.onload({ target: this } as unknown as ProgressEvent<FileReader>)
          }
        }),
      })
    })
    global.FileReader = MockFileReader as unknown as typeof FileReader

    const file = new File(['audio'], 'alarm.mp3', { type: 'audio/mpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ customAudioName: 'alarm.mp3' }))
    })

    global.FileReader = OriginalFileReader
  })

  it('rejects files larger than 3 MB and shows an error', async () => {
    renderPanel()

    const oversized = new File([new ArrayBuffer(3.1 * 1024 * 1024)], 'big.mp3', { type: 'audio/mpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, oversized)

    expect(screen.getByText(/file too large/i)).toBeInTheDocument()
  })

  it('does not show an error for a file exactly at the 3 MB boundary', async () => {
    renderPanel()

    const OriginalFileReader = global.FileReader
    const MockFileReader = vi.fn().mockImplementation(function (this: FileReader) {
      Object.assign(this, {
        result: 'data:audio/mpeg;base64,dGVzdA==',
        readAsDataURL: vi.fn().mockImplementation(function (this: FileReader) {
          if (this.onload) {
            this.onload({ target: this } as unknown as ProgressEvent<FileReader>)
          }
        }),
      })
    })
    global.FileReader = MockFileReader as unknown as typeof FileReader

    const atLimit = new File([new ArrayBuffer(3 * 1024 * 1024)], 'exact.mp3', { type: 'audio/mpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, atLimit)

    await waitFor(() => {
      expect(screen.queryByText(/file too large/i)).not.toBeInTheDocument()
    })

    global.FileReader = OriginalFileReader
  })

  it('rejects non-audio files', () => {
    renderPanel()

    const videoFile = new File(['data'], 'clip.mp4', { type: 'video/mp4' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    // Use fireEvent so jsdom's accept-attribute filter doesn't silently drop the file
    Object.defineProperty(input, 'files', { value: [videoFile], configurable: true })
    fireEvent.change(input)

    expect(screen.getByText(/please choose an audio file/i)).toBeInTheDocument()
  })

  it('shows "Remove custom sound" button when custom audio is set', () => {
    renderPanel({ customAudioName: 'track.mp3', customAudioB64: 'data:audio/mpeg;base64,dGVzdA==' })
    expect(screen.getByRole('button', { name: /remove custom sound/i })).toBeInTheDocument()
  })

  it('calls onChange with null audio when × is clicked', async () => {
    const { onChange } = renderPanel({ customAudioName: 'track.mp3', customAudioB64: 'data:audio/mpeg;base64,dGVzdA==' })
    await userEvent.click(screen.getByRole('button', { name: /remove custom sound/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ customAudioB64: null, customAudioName: null }))
  })

  it('shows "Change song" label when custom audio is already set', () => {
    renderPanel({ customAudioName: 'track.mp3', customAudioB64: 'data:audio/mpeg;base64,dGVzdA==' })
    expect(screen.getByRole('button', { name: /change song/i })).toBeInTheDocument()
  })

  it('shows saveError when provided and no uploadError', () => {
    renderPanel({}, "Couldn't save — device storage is full.")
    expect(screen.getByText(/device storage is full/i)).toBeInTheDocument()
  })
})

// ─── Test (preview) button ─────────────────────────────────────────────────

describe('Sound settings – Test button', () => {
  it('renders a Test button', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /test/i })).toBeInTheDocument()
  })

  it('creates an AudioContext when Test is clicked with default sound', async () => {
    const AudioContextSpy = vi.spyOn(window, 'AudioContext' as never)
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: /test/i }))
    expect(AudioContextSpy).toHaveBeenCalled()
  })

  it('creates an Audio element when Test is clicked with custom audio', async () => {
    const AudioSpy = vi.spyOn(window, 'Audio' as never)
    renderPanel({ customAudioName: 'track.mp3', customAudioB64: 'data:audio/mpeg;base64,dGVzdA==' })
    await userEvent.click(screen.getByRole('button', { name: /test/i }))
    expect(AudioSpy).toHaveBeenCalled()
  })
})

// ─── localStorage key constants (kept for import reference) ───────────────
// SOUND_KEY and SOUND_AUDIO_KEY are exported for integration tests elsewhere
export { SOUND_KEY, SOUND_AUDIO_KEY }
