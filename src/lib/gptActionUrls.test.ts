import { describe, expect, it } from 'vitest'
import { buildGptActionUrl } from './gptActionUrls'

describe('buildGptActionUrl', () => {
  it('monta a URL da function a partir de uma base valida', () => {
    expect(buildGptActionUrl('campaign-snapshot', 'https://abcdefgh.supabase.co')).toBe(
      'https://abcdefgh.supabase.co/functions/v1/campaign-snapshot'
    )
  })

  it('remove barra final duplicada da base', () => {
    expect(buildGptActionUrl('request-dice-roll', 'https://abcdefgh.supabase.co/')).toBe(
      'https://abcdefgh.supabase.co/functions/v1/request-dice-roll'
    )
  })

  it('retorna null quando a base esta ausente', () => {
    expect(buildGptActionUrl('campaign-snapshot', undefined)).toBeNull()
  })

  it('retorna null quando a base e invalida', () => {
    expect(buildGptActionUrl('campaign-snapshot', 'nao-e-uma-url')).toBeNull()
  })

  it('nunca contem o placeholder SEU_PROJECT_REF', () => {
    const url = buildGptActionUrl('campaign-snapshot', 'https://abcdefgh.supabase.co')
    expect(url).not.toContain('SEU_PROJECT_REF')
  })
})
