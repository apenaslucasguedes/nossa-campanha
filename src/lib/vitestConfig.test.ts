import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VITEST_INCLUDE } from '../../vite.config'

function officialTests(directory: string): string[] {
  return readdirSync(resolve(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) return officialTests(path)
    return /\.(test|spec)\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

function isCollected(path: string) {
  if (path.startsWith('src/')) return /\.(test|spec)\.(ts|tsx)$/.test(path)
  if (path.startsWith('supabase/')) return /\.test\.ts$/.test(path)
  return false
}

describe('coleta oficial do Vitest', () => {
  it('mantém os padrões restritos a src e supabase', () => {
    expect(VITEST_INCLUDE).toEqual([
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'supabase/**/*.test.ts',
    ])
  })

  it('coleta todos os testes oficiais e preserva a quantidade anterior mais esta guarda', () => {
    const files = [...officialTests('src'), ...officialTests('supabase')]
    expect(files).toHaveLength(37)
    expect(files.every(isCollected)).toBe(true)
  })

  it('não coleta experiments e continua coletando qualquer falha real em src', () => {
    expect(isCollected('experiments/chatgpt-app/test/roll-state.test.js')).toBe(false)
    expect(isCollected('experiments/future/hidden.test.ts')).toBe(false)
    expect(isCollected('src/example/real-failure.test.ts')).toBe(true)
  })
})
