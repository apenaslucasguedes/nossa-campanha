import { afterEach, describe, expect, it, vi } from 'vitest'
import { characterNames, getCharacterNameGender, getRandomCharacterName } from './characterNames'

afterEach(() => vi.unstubAllGlobals())

describe('nomes de personagem de Auren', () => {
  it('mantém listas masculina e feminina extensas e sem duplicações internas', () => {
    expect(characterNames.masculine.length).toBeGreaterThanOrEqual(80)
    expect(characterNames.feminine.length).toBeGreaterThanOrEqual(80)
    expect(characterNames.masculine.length).toBeGreaterThan(0)
    expect(characterNames.feminine.length).toBeGreaterThan(0)
    expect(new Set(characterNames.masculine).size).toBe(characterNames.masculine.length)
    expect(new Set(characterNames.feminine).size).toBe(characterNames.feminine.length)
    const feminineNames = new Set<string>(characterNames.feminine)
    expect(characterNames.masculine.filter((name) => feminineNames.has(name))).toHaveLength(0)
  })

  it('sorteia somente a lista correspondente ao gênero', () => {
    vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => { values[0] = 0; return values } })
    expect(characterNames.masculine).toContain(getRandomCharacterName('masculine'))
    expect(characterNames.feminine).toContain(getRandomCharacterName('feminine'))
  })

  it('evita repetir consecutivamente o nome anterior', () => {
    vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => { values[0] = 0; return values } })
    const previous = characterNames.masculine[0]
    expect(getRandomCharacterName('masculine', previous)).not.toBe(previous)
  })

  it('reconhece apenas os gêneros informados na apresentação', () => {
    expect(getCharacterNameGender('Masculino, ele/dele')).toBe('masculine')
    expect(getCharacterNameGender('Feminino, ela/dela')).toBe('feminine')
    expect(getCharacterNameGender('elu/delu')).toBeNull()
  })
})
