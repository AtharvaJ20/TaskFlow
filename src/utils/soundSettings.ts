export const SOUND_KEY = 'taskflow-sound-settings'

export interface SoundSettings {
  volume: number          // 0.0 – 1.0
  durationSecs: number    // 1 – 30
  customAudioB64: string | null
  customAudioName: string | null
}

export const DEFAULT_SOUND: SoundSettings = {
  volume: 0.75,
  durationSecs: 10,
  customAudioB64: null,
  customAudioName: null,
}

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(SOUND_KEY)
    if (!raw) return DEFAULT_SOUND
    return { ...DEFAULT_SOUND, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SOUND
  }
}

export function saveSoundSettings(s: SoundSettings): boolean {
  try {
    const { customAudioB64, ...rest } = s
    localStorage.setItem(SOUND_KEY, JSON.stringify({ ...rest, hasCustomAudio: !!customAudioB64 }))
    if (customAudioB64) localStorage.setItem(SOUND_KEY + '_audio', customAudioB64)
    else localStorage.removeItem(SOUND_KEY + '_audio')
    return true
  } catch {
    return false
  }
}

export function loadSoundSettingsFull(): SoundSettings {
  const base = loadSoundSettings()
  try {
    const audio = localStorage.getItem(SOUND_KEY + '_audio')
    return { ...base, customAudioB64: audio ?? null }
  } catch {
    return base
  }
}

export async function playMelody(
  type: 'work' | 'break',
  volume: number,
  durationSecs: number,
  onBlocked?: () => void,
) {
  try {
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch {}
    }
    if (ctx.state === 'suspended') {
      onBlocked?.()
      ctx.close()
      return
    }
    const master = ctx.createGain()
    master.gain.value = Math.max(0, Math.min(1, volume))
    master.connect(ctx.destination)

    const notes: { freq: number; start: number; dur: number }[] =
      type === 'work'
        ? [
            { freq: 523,  start: 0.0,  dur: 0.4 },
            { freq: 659,  start: 0.5,  dur: 0.4 },
            { freq: 784,  start: 1.0,  dur: 0.4 },
            { freq: 1047, start: 1.5,  dur: 0.7 },
            { freq: 784,  start: 2.3,  dur: 0.3 },
            { freq: 880,  start: 2.7,  dur: 0.3 },
            { freq: 1047, start: 3.1,  dur: 0.7 },
            { freq: 880,  start: 3.9,  dur: 0.3 },
            { freq: 784,  start: 4.3,  dur: 0.3 },
            { freq: 1047, start: 4.7,  dur: 0.5 },
            { freq: 1175, start: 5.3,  dur: 0.5 },
            { freq: 1047, start: 5.9,  dur: 0.5 },
            { freq: 880,  start: 6.5,  dur: 0.5 },
            { freq: 1047, start: 7.1,  dur: 0.5 },
            { freq: 1175, start: 7.7,  dur: 0.6 },
            { freq: 1047, start: 8.4,  dur: 1.5 },
          ]
        : [
            { freq: 880,  start: 0.0,  dur: 0.5 },
            { freq: 784,  start: 0.65, dur: 0.5 },
            { freq: 659,  start: 1.3,  dur: 0.5 },
            { freq: 523,  start: 1.95, dur: 0.5 },
            { freq: 659,  start: 2.6,  dur: 0.5 },
            { freq: 784,  start: 3.25, dur: 0.5 },
            { freq: 659,  start: 3.9,  dur: 0.5 },
            { freq: 523,  start: 4.55, dur: 0.5 },
            { freq: 440,  start: 5.2,  dur: 0.5 },
            { freq: 392,  start: 5.85, dur: 0.5 },
            { freq: 440,  start: 6.5,  dur: 0.5 },
            { freq: 392,  start: 7.15, dur: 0.5 },
            { freq: 349,  start: 7.8,  dur: 0.5 },
            { freq: 392,  start: 8.45, dur: 1.5 },
          ]

    const lastNote = notes[notes.length - 1]
    const naturalEnd = lastNote.start + lastNote.dur
    const cutoff = Math.min(durationSecs, naturalEnd)

    if (cutoff < naturalEnd) {
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime + Math.max(0, cutoff - 0.25))
      master.gain.linearRampToValueAtTime(0.0, ctx.currentTime + cutoff)
    }

    notes.forEach(({ freq, start, dur }, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(master)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + start
      gain.gain.setValueAtTime(0.0, t)
      gain.gain.linearRampToValueAtTime(0.75, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.start(t)
      osc.stop(Math.min(t + dur, ctx.currentTime + cutoff + 0.05))
      if (i === notes.length - 1) osc.onended = () => ctx.close()
    })

    setTimeout(() => { try { ctx.close() } catch {} }, (cutoff + 1) * 1000)
  } catch {}
}

export function playCustomAudio(
  dataUrl: string,
  volume: number,
  durationSecs: number,
  onBlocked?: () => void,
) {
  try {
    const audio = new Audio(dataUrl)
    audio.volume = Math.max(0, Math.min(1, volume))
    const p = audio.play()
    if (p) {
      p.catch(err => {
        if ((err as DOMException).name === 'NotAllowedError') onBlocked?.()
      })
    }
    const timer = setTimeout(() => { audio.pause(); audio.currentTime = 0 }, durationSecs * 1000)
    audio.onended = () => clearTimeout(timer)
  } catch {}
}

export function playAlert(
  type: 'work' | 'break',
  settings: SoundSettings,
  onBlocked?: () => void,
) {
  if (settings.customAudioB64) {
    playCustomAudio(settings.customAudioB64, settings.volume, settings.durationSecs, onBlocked)
  } else {
    playMelody(type, settings.volume, settings.durationSecs, onBlocked)
  }
}
