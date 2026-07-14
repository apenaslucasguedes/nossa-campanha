export type ShadowProfile = 'fabric' | 'metal' | 'skin' | 'hair' | 'wood' | 'magic'

type Hsl = { h: number; s: number; l: number }

export function hexToHsl(hex: string): Hsl {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
    case g: h = ((b - r) / d + 2) * 60; break
    default: h = ((r - g) / d + 4) * 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360
  const sat = Math.min(100, Math.max(0, s)) / 100
  const lum = Math.min(100, Math.max(0, l)) / 100
  const c = (1 - Math.abs(2 * lum - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lum - c / 2
  let r = 0, g = 0, b = 0
  if (hue < 60) { r = c; g = x; b = 0 }
  else if (hue < 120) { r = x; g = c; b = 0 }
  else if (hue < 180) { r = 0; g = c; b = x }
  else if (hue < 240) { r = 0; g = x; b = c }
  else if (hue < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const toHex = (value: number) => Math.min(255, Math.max(0, Math.round((value + m) * 255))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const MIN_LIGHTNESS = 6

const profileAdjustments: Record<ShadowProfile, { lightness: number; saturation: number; hue: number }> = {
  fabric: { lightness: -22, saturation: 6, hue: 0 },
  metal: { lightness: -18, saturation: -4, hue: 0 },
  skin: { lightness: -15, saturation: 3, hue: -3 },
  hair: { lightness: -20, saturation: 5, hue: 0 },
  wood: { lightness: -24, saturation: 2, hue: -4 },
  magic: { lightness: -6, saturation: 0, hue: 3 },
}

export function deriveShadow(baseColor: string, profile: ShadowProfile): string {
  const { h, s, l } = hexToHsl(baseColor)
  const adjustment = profileAdjustments[profile]
  const lightness = Math.max(MIN_LIGHTNESS, l + adjustment.lightness)
  const saturation = Math.min(100, Math.max(0, s + adjustment.saturation))
  const hue = h + adjustment.hue
  return hslToHex({ h: hue, s: saturation, l: lightness })
}
