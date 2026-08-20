import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement matchMedia — provide a no-op stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// jsdom does not implement Web Audio API
class MockAudioContext {
  currentTime = 0
  destination = {}
  state: AudioContextState = 'running'
  createOscillator() {
    const osc = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine' as OscillatorType,
      onended: null as (() => void) | null,
    }
    return osc
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }
  }
  close() { return Promise.resolve() }
  resume() { return Promise.resolve() }
}
Object.defineProperty(window, 'AudioContext', { writable: true, value: MockAudioContext })

// jsdom does not implement HTMLAudioElement.play
Object.defineProperty(window, 'Audio', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
    volume: 1,
    onended: null as (() => void) | null,
  })),
})

// jsdom does not implement Notification
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: Object.assign(vi.fn(), { permission: 'denied' as NotificationPermission }),
})
