import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('configuração das Edge Functions de GPT', () => {
  it('publica request-dice-pool sem exigir JWT de usuário', () => {
    const config = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8')
    expect(config).toMatch(/\[functions\.request-dice-pool\]\s*verify_jwt\s*=\s*false/)
  })
})
