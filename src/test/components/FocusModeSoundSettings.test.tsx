import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FocusMode from '../../components/FocusMode'
import type { Task } from '../../types/task'

const SOUND_KEY = 'taskflow-sound-settings'
const SOUND_AUDIO_KEY = 'taskflow-sound-settings_audio'

const baseTask: Task = {
  id: 'task-1',
  title: 'Write unit tests',
  completed: false,
  priority: 'medium',
  tags: [],
  subtasks: [],
  createdAt: new Date().toISOString(),
}

const props = {
  task: baseTask,
  onClose: vi.fn(),
  onComplete: vi.fn(),
  onToggleSubtask: vi.fn(),
  onLogTime: vi.fn(),
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

async function openPanel() {
  const user = userEvent.setup()
  render(<FocusMode {...props} />)
  await user.click(screen.getByRole('button', { name: /sound settings/i }))
  return user
}

// ─── Panel visibility ──────────────────────────────────────────────────────

describe('Sound settings panel – visibility', () => {
  it('is hidden by default', () => {
    render(<FocusMode {...props} />)
    expect(screen.queryByLabelText(/alert volume/i)).not.toBeInTheDocument()
  })

  it('opens when the gear icon is clicked', async () => {
    await openPanel()
    expect(screen.getByLabelText(/alert volume/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/alert duration in seconds/i)).toBeInTheDocument()
  })

  it('closes when the gear icon is clicked a second time', async () => {
    const user = await openPanel()
    await user.click(screen.getByRole('button', { name: /sound settings/i }))
    expect(screen.queryByLabelText(/alert volume/i)).not.toBeInTheDocument()
  })
})

// ─── Volume slider ─────────────────────────────────────────────────────────

describe('Sound settings – volume', () => {
  it('defaults to 75%', async () => {
    await openPanel()
    const slider = screen.getByLabelText(/alert volume/i) as HTMLInputElement
    expect(slider.value).toBe('75')
  })

  it('displays the current percentage', async () => {
    await openPanel()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('updates the displayed percentage when the slider moves', async () => {
    await openPanel()
    const slider = screen.getByLabelText(/alert volume/i)
    fireEvent.change(slider, { target: { value: '40' } })
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('persists volume to localStorage immediately on change', async () => {
    await openPanel()
    fireEvent.change(screen.getByLabelText(/alert volume/i), { target: { value: '50' } })
    const stored = JSON.parse(localStorage.getItem(SOUND_KEY) ?? '{}')
    expect(stored.volume).toBeCloseTo(0.5, 2)
  })

  it('loads persisted volume on mount', async () => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: 0.2, durationSecs: 10, hasCustomAudio: false }))
    await openPanel()
    const slider = screen.getByLabelText(/alert volume/i) as HTMLInputElement
    expect(slider.value).toBe('20')
  })
})

// ─── Duration slider ───────────────────────────────────────────────────────

describe('Sound settings – duration', () => {
  it('defaults to 10s', async () => {
    await openPanel()
    const slider = screen.getByLabelText(/alert duration in seconds/i) as HTMLInputElement
    expect(slider.value).toBe('10')
  })

  it('displays the current value in seconds', async () => {
    await openPanel()
    expect(screen.getByText('10s')).toBeInTheDocument()
  })

  it('updates the displayed value when the slider moves', async () => {
    await openPanel()
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '5' } })
    expect(screen.getByText('5s')).toBeInTheDocument()
  })

  it('persists duration to localStorage immediately on change', async () => {
    await openPanel()
    fireEvent.change(screen.getByLabelText(/alert duration in seconds/i), { target: { value: '15' } })
    const stored = JSON.parse(localStorage.getItem(SOUND_KEY) ?? '{}')
    expect(stored.durationSecs).toBe(15)
  })

  it('min boundary: accepts 1s', async () => {
    await openPanel()
    const slider = screen.getByLabelText(/alert duration in seconds/i) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '1' } })
    expect(slider.value).toBe('1')
  })

  it('max boundary: accepts 30s', async () => {
    await openPanel()
    const slider = screen.getByLabelText(/alert duration in seconds/i) as HTMLInputElement
    fireEvent.change(slider, { target: { value: '30' } })
    expect(slider.value).toBe('30')
  })

  it('loads persisted duration on mount', async () => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: 0.75, durationSecs: 20, hasCustomAudio: false }))
    await openPanel()
    const slider = screen.getByLabelText(/alert duration in seconds/i) as HTMLInputElement
    expect(slider.value).toBe('20')
  })
})

// ─── Custom audio upload ───────────────────────────────────────────────────

describe('Sound settings – custom audio upload', () => {
  it('shows "Default melody" when no custom audio is set', async () => {
    await openPanel()
    expect(screen.getByText(/default melody/i)).toBeInTheDocument()
  })

  it('shows the uploaded filename after a valid file is selected', async () => {
    await openPanel()

    // Replace FileReader constructor with a mock that fires onload synchronously
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
      expect(screen.getByText('alarm.mp3')).toBeInTheDocument()
    })

    global.FileReader = OriginalFileReader
  })

  it('rejects files larger than 3 MB and shows an error', async () => {
    await openPanel()

    const oversized = new File([new ArrayBuffer(3.1 * 1024 * 1024)], 'big.mp3', { type: 'audio/mpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, oversized)

    expect(screen.getByText(/file too large/i)).toBeInTheDocument()
    expect(screen.queryByText('big.mp3')).not.toBeInTheDocument()
  })

  it('does not show an error for a file exactly at the 3 MB boundary', async () => {
    await openPanel()

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

  it('removes custom audio and shows "Default melody" when × is clicked', async () => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: 0.75, durationSecs: 10, hasCustomAudio: true, customAudioName: 'track.mp3' }))
    localStorage.setItem(SOUND_AUDIO_KEY, 'data:audio/mpeg;base64,dGVzdA==')

    const user = userEvent.setup()
    render(<FocusMode {...props} />)
    await user.click(screen.getByRole('button', { name: /sound settings/i }))

    expect(screen.getByText('track.mp3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove custom sound/i }))

    expect(screen.getByText(/default melody/i)).toBeInTheDocument()
    expect(screen.queryByText('track.mp3')).not.toBeInTheDocument()
  })

  it('clears custom audio from localStorage when removed', async () => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: 0.75, durationSecs: 10, hasCustomAudio: true, customAudioName: 'track.mp3' }))
    localStorage.setItem(SOUND_AUDIO_KEY, 'data:audio/mpeg;base64,dGVzdA==')

    const user = userEvent.setup()
    render(<FocusMode {...props} />)
    await user.click(screen.getByRole('button', { name: /sound settings/i }))
    await user.click(screen.getByRole('button', { name: /remove custom sound/i }))

    expect(localStorage.getItem(SOUND_AUDIO_KEY)).toBeNull()
  })

  it('shows "Change song" label when a custom audio is already set', async () => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: 0.75, durationSecs: 10, hasCustomAudio: true, customAudioName: 'track.mp3' }))
    localStorage.setItem(SOUND_AUDIO_KEY, 'data:audio/mpeg;base64,dGVzdA==')

    const user = userEvent.setup()
    render(<FocusMode {...props} />)
    await user.click(screen.getByRole('button', { name: /sound settings/i }))

    expect(screen.getByRole('button', { name: /change song/i })).toBeInTheDocument()
  })
})

// ─── Test (preview) button ─────────────────────────────────────────────────

describe('Sound settings – Test button', () => {
  it('renders a Test button', async () => {
    await openPanel()
    expect(screen.getByRole('button', { name: /test/i })).toBeInTheDocument()
  })

  it('creates an AudioContext when Test is clicked with default sound', async () => {
    const AudioContextSpy = vi.spyOn(window, 'AudioContext' as never)
    const user = await openPanel()
    await user.click(screen.getByRole('button', { name: /test/i }))
    expect(AudioContextSpy).toHaveBeenCalled()
  })

  it('creates an Audio element when Test is clicked with custom audio', async () => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: 0.75, durationSecs: 10, hasCustomAudio: true, customAudioName: 'track.mp3' }))
    localStorage.setItem(SOUND_AUDIO_KEY, 'data:audio/mpeg;base64,dGVzdA==')

    const AudioSpy = vi.spyOn(window, 'Audio' as never)
    const user = userEvent.setup()
    render(<FocusMode {...props} />)
    await user.click(screen.getByRole('button', { name: /sound settings/i }))
    await user.click(screen.getByRole('button', { name: /test/i }))

    expect(AudioSpy).toHaveBeenCalled()
  })
})
