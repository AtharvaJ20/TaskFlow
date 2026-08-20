import { useState, useEffect, useCallback } from 'react'

export type AccentColor = 'indigo' | 'violet' | 'rose' | 'emerald' | 'amber' | 'sky'

export interface AccentOption {
  label: string
  hex: string   // swatch color
}

export const ACCENT_OPTIONS: Record<AccentColor, AccentOption> = {
  indigo:  { label: 'Indigo',  hex: '#6366f1' },
  violet:  { label: 'Violet',  hex: '#8b5cf6' },
  rose:    { label: 'Rose',    hex: '#f43f5e' },
  emerald: { label: 'Emerald', hex: '#10b981' },
  amber:   { label: 'Amber',   hex: '#f59e0b' },
  sky:     { label: 'Sky',     hex: '#0ea5e9' },
}

// Space-separated RGB channels (for Tailwind opacity support via rgb(var / alpha))
type Shades = { s50: string; s100: string; s300: string; s400: string; s500: string; s600: string; s700: string; s900: string; hex: string }

const PALETTES: Record<AccentColor, Shades> = {
  indigo:  { s50:'238 242 255', s100:'224 231 255', s300:'165 180 252', s400:'129 140 248', s500:'99 102 241',  s600:'79 70 229',  s700:'67 56 202',  s900:'49 46 129',  hex:'#6366f1' },
  violet:  { s50:'245 243 255', s100:'237 233 254', s300:'196 181 253', s400:'167 139 250', s500:'139 92 246',  s600:'124 58 237', s700:'109 40 217', s900:'46 16 101',  hex:'#8b5cf6' },
  rose:    { s50:'255 241 242', s100:'255 228 230', s300:'253 164 175', s400:'251 113 133', s500:'244 63 94',   s600:'225 29 72',  s700:'190 18 60',  s900:'76 5 25',    hex:'#f43f5e' },
  emerald: { s50:'236 253 245', s100:'209 250 229', s300:'110 231 183', s400:'52 211 153',  s500:'16 185 129',  s600:'5 150 105',  s700:'4 120 87',   s900:'6 78 59',    hex:'#10b981' },
  amber:   { s50:'255 251 235', s100:'254 243 199', s300:'252 211 77',  s400:'251 191 36',  s500:'245 158 11',  s600:'217 119 6',  s700:'180 83 9',   s900:'69 26 3',    hex:'#f59e0b' },
  sky:     { s50:'240 249 255', s100:'224 242 254', s300:'125 211 252', s400:'56 189 248',  s500:'14 165 233',  s600:'2 132 199',  s700:'3 105 161',  s900:'12 74 110',  hex:'#0ea5e9' },
}

const STORAGE_KEY = 'taskflow-accent'

function applyAccent(color: AccentColor) {
  const p = PALETTES[color]
  const r = document.documentElement
  r.style.setProperty('--ca-50',  p.s50)
  r.style.setProperty('--ca-100', p.s100)
  r.style.setProperty('--ca-300', p.s300)
  r.style.setProperty('--ca-400', p.s400)
  r.style.setProperty('--ca-500', p.s500)
  r.style.setProperty('--ca-600', p.s600)
  r.style.setProperty('--ca-700', p.s700)
  r.style.setProperty('--ca-900', p.s900)
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = p.hex
}

export function useAccentColor() {
  const [accent, setAccentState] = useState<AccentColor>(
    () => (localStorage.getItem(STORAGE_KEY) as AccentColor) ?? 'indigo'
  )

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  const setAccent = useCallback((color: AccentColor) => {
    localStorage.setItem(STORAGE_KEY, color)
    setAccentState(color)
  }, [])

  return { accent, setAccent }
}
