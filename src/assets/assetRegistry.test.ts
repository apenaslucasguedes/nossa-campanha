import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brandRegistry } from './brandRegistry'
import { characterRegistry } from './characterRegistry'
import { iconRegistry } from './iconRegistry'
import { mapRegistry } from './mapRegistry'
import { regionRegistry } from './regionRegistry'

function publicPath(url: string) {
  const relative = decodeURIComponent(url.split('/assets/')[1] ?? '')
  return resolve('public/assets', relative)
}

describe('registro central de assets', () => {
  it('aponta apenas para arquivos públicos existentes', () => {
    const urls = [
      ...Object.values(brandRegistry),
      ...Object.values(characterRegistry).map((asset) => asset.artwork),
      ...Object.values(iconRegistry).map((asset) => asset.path),
      ...Object.values(regionRegistry).map((asset) => asset.image),
      mapRegistry.auren.water,
      mapRegistry.auren.illustrated,
      mapRegistry.auren.interactive,
    ]

    expect(urls).not.toHaveLength(0)
    for (const url of urls) expect(existsSync(publicPath(url)), url).toBe(true)
  })

  it('preserva os nomes reais das novas imagens regionais', () => {
    expect(regionRegistry['arquipelago-de-vesper'].image).toContain('Arquipelago de Vesper.png')
    expect(regionRegistry['ilhas-cinzentas'].image).toContain('Ilhas Cinzentas.png')
    expect(regionRegistry.ormara.image).toContain('Ormara.png')
  })
})
