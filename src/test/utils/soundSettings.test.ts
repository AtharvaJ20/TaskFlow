import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SOUND,
  loadSoundSettings,
  saveSoundSettings,
  loadSoundSettingsFull,
  playAlert,
  SOUND_KEY,
} from '../../utils/soundSettings'

beforeEach(() => {
  localStorage.clear()
})

describe('soundSettings – loadSoundSettings', () => {
  it('returns DEFAULT_SOUND when localStorage is empty', () => {
    const s = loadSoundSettings()
    expect(s).toEqual(DEFAULT_SOUND)
  })

  it('merges stored settings with defaults', () => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: 0.5, durationSecs: 5 }))
    const s = loadSoundSettings()
    expect(s.volume).toBe(0.5)
    expect(s.durationSecs).toBe(5)
    expect(s.customAudioB64).toBeNull()
  })

  it('returns DEFAULT_SOUND when localStorage value is invalid JSON', () => {
    localStorage.setItem(SOUND_KEY, 'not-json')
    const s = loadSoundSettings()
    expect(s).toEqual(DEFAULT_SOUND)
  })
})

describe('soundSettings – saveSoundSettings', () => {
  it('returns true and persists settings to localStorage', () => {
    const result = saveSoundSettings({ ...DEFAULT_SOUND, volume: 0.3 })
    expect(result).toBe(true)
    const stored = JSON.parse(localStorage.getItem(SOUND_KEY) ?? '{}')
    expect(stored.volume).toBe(0.3)
  })

  it('stores custom audio separately when provided', () => {
    const settings = { ...DEFAULT_SOUND, customAudioB64: 'data:audio/mp3;base64,abc' }
    saveSoundSettings(settings)
    expect(localStorage.getItem(SOUND_KEY + '_audio')).toBe('data:audio/mp3;base64,abc')
  })

  it('removes audio key when customAudioB64 is null', () => {
    localStorage.setItem(SOUND_KEY + '_audio', 'old-data')
    saveSoundSettings({ ...DEFAULT_SOUND, customAudioB64: null })
    expect(localStorage.getItem(SOUND_KEY + '_audio')).toBeNull()
  })

  it('does not store customAudioB64 in the main settings key', () => {
    saveSoundSettings({ ...DEFAULT_SOUND, customAudioB64: 'data:audio/mp3;base64,abc' })
    const stored = JSON.parse(localStorage.getItem(SOUND_KEY) ?? '{}')
    expect(stored.customAudioB64).toBeUndefined()
    expect(stored.hasCustomAudio).toBe(true)
  })
})

describe('soundSettings – loadSoundSettingsFull', () => {
  it('returns base settings with null customAudioB64 when no audio stored', () => {
    const s = loadSoundSettingsFull()
    expect(s.customAudioB64).toBeNull()
  })

  it('includes customAudioB64 from separate storage key', () => {
    localStorage.setItem(SOUND_KEY + '_audio', 'data:audio/mp3;base64,xyz')
    const s = loadSoundSettingsFull()
    expect(s.customAudioB64).toBe('data:audio/mp3;base64,xyz')
  })
})

describe('soundSettings – playAlert', () => {
  it('calls playMelody (via AudioContext) when no custom audio', async () => {
    const AudioContextSpy = vi.spyOn(window, 'AudioContext' as never)
    await playAlert('work', DEFAULT_SOUND)
    expect(AudioContextSpy).toHaveBeenCalled()
    AudioContextSpy.mockRestore()
  })

  it('calls playCustomAudio (via Audio) when customAudioB64 is set', async () => {
    const AudioSpy = vi.spyOn(window, 'Audio' as never)
    await playAlert('work', { ...DEFAULT_SOUND, customAudioB64: 'data:audio/mp3;base64,abc' })
    expect(AudioSpy).toHaveBeenCalledWith('data:audio/mp3;base64,abc')
    AudioSpy.mockRestore()
  })
})
