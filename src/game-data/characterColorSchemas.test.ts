import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { characterColorSchemas } from './characterColorSchemas'
import { characterRegistry } from '../assets/characterRegistry'
import type { ClassKey } from '../types/database'

function svgIds(classKey: ClassKey): Set<string> {
  const filename = characterRegistry[classKey].artwork.split('/').pop() as string
  const svg = readFileSync(join(__dirname, '..', '..', 'public', 'assets', 'characters', filename), 'utf-8')
  const ids = new Set<string>()
  const regex = /\bid="([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(svg))) ids.add(match[1])
  return ids
}

describe('characterColorSchemas', () => {
  for (const classKey of Object.keys(characterColorSchemas) as ClassKey[]) {
    it(`${classKey}: todo alvo e sombra existem no SVG real`, () => {
      const ids = svgIds(classKey)
      for (const layer of characterColorSchemas[classKey]) {
        expect(ids.has(layer.groupId)).toBe(true)
        if (layer.shadowGroupId) expect(ids.has(layer.shadowGroupId)).toBe(true)
      }
    })

    it(`${classKey}: chaves de camada são únicas dentro da classe`, () => {
      const keys = characterColorSchemas[classKey].map((layer) => layer.key)
      expect(new Set(keys).size).toBe(keys.length)
    })
  }

  it('druida não expõe camada de cajado nem lâmina', () => {
    const keys = characterColorSchemas.druid.map((layer) => layer.key)
    expect(keys).not.toContain('staff')
    expect(keys).not.toContain('blade')
  })

  it('guerreiro não expõe camada de cabelo', () => {
    const keys = characterColorSchemas.warrior.map((layer) => layer.key)
    expect(keys).not.toContain('hair')
  })

  it('arcanista distingue capa de roupa', () => {
    const keys = characterColorSchemas.arcanist.map((layer) => layer.key)
    expect(keys).toContain('outfit')
    expect(keys).toContain('cape')
  })

  it('arcanista deriva a sombra do tom de pele pelo grupo real', () => {
    const skin = characterColorSchemas.arcanist.find((layer) => layer.key === 'skin')
    expect(skin).toMatchObject({ groupId: 'cor_pele', shadowGroupId: 'sombra_pele', shadowProfile: 'skin' })
  })

  it('lâmina sombria expõe somente o cabelo real da própria classe', () => {
    expect(characterColorSchemas.shadow_blade).toContainEqual(expect.objectContaining({ key: 'hair', groupId: 'cabelo' }))
    expect(characterColorSchemas.arcanist.some((layer) => layer.groupId === 'cabelo')).toBe(false)
    expect(characterColorSchemas.warrior.some((layer) => layer.groupId === 'cabelo')).toBe(false)
    expect(characterColorSchemas.necromancer.some((layer) => layer.groupId === 'cabelo')).toBe(false)
  })

  it('druida expõe os olhos reais como brilho mágico', () => {
    expect(characterColorSchemas.druid).toContainEqual(expect.objectContaining({ key: 'eyes', label: 'Olhos — brilho mágico', groupId: 'olhos' }))
  })
})
