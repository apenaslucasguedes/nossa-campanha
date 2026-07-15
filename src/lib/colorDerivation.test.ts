import { describe, expect, it } from 'vitest'
import { deriveShadow, hexToHsl, hslToHex, type ShadowProfile } from './colorDerivation'

const PROFILES: ShadowProfile[] = ['fabric', 'metal', 'skin', 'hair', 'wood', 'magic']

describe('hexToHsl / hslToHex', () => {
  it('faz round-trip aproximado', () => {
    const hsl = hexToHsl('#7f3f36')
    const hex = hslToHex(hsl)
    expect(hex).toBe('#7f3f36')
  })
  it('deixa a sombra do brilho magico claramente mais escura', () => {
    const base = hexToHsl('#45d7c4')
    const shadow = hexToHsl(deriveShadow('#45d7c4', 'magic'))
    expect(base.l - shadow.l).toBeGreaterThanOrEqual(20)
    expect(base.l - shadow.l).toBeLessThanOrEqual(24)
    expect(shadow.h).toBeCloseTo(base.h, 0)
  })
})

describe('deriveShadow', () => {
  for (const profile of PROFILES) {
    it(`${profile}: reduz luminosidade e nunca chega a preto puro`, () => {
      const shadow = deriveShadow('#b45353', profile)
      const base = hexToHsl('#b45353')
      const derived = hexToHsl(shadow)
      expect(derived.l).toBeLessThan(base.l)
      expect(shadow.toLowerCase()).not.toBe('#000000')
    })
  }

  it('fabric aumenta saturação e reduz luminosidade em ~22%', () => {
    const base = hexToHsl('#7f3f36')
    const shadow = hexToHsl(deriveShadow('#7f3f36', 'fabric'))
    expect(base.l - shadow.l).toBeGreaterThanOrEqual(15)
    expect(base.l - shadow.l).toBeLessThanOrEqual(28)
    expect(shadow.s).toBeGreaterThanOrEqual(base.s)
  })

  it('nunca produz luminosidade abaixo do piso mínimo mesmo para cores já escuras', () => {
    const shadow = hexToHsl(deriveShadow('#1a1a1a', 'wood'))
    expect(shadow.l).toBeGreaterThan(0)
  })
})
