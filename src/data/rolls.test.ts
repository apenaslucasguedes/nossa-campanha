import { describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }))

const { performDiceRoll, requestRoll } = await import('./rolls')

describe('performDiceRoll', () => {
  it('traduz NOT_YOUR_CHARACTER em mensagem legível', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'NOT_YOUR_CHARACTER', code: '42501' } })
    await expect(performDiceRoll({ campaign_id: 'c1', dice: 'd20' })).rejects.toThrow('Esta rolagem pertence a outro personagem.')
  })

  it('traduz NO_CHARACTER_SEATED em mensagem legível', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'NO_CHARACTER_SEATED', code: 'P0002' } })
    await expect(performDiceRoll({ campaign_id: 'c1', dice: 'd20' })).rejects.toThrow('Você não possui um personagem nesta campanha.')
  })

  it('retorna o resultado autoritativo do servidor em caso de sucesso', async () => {
    const result = { roll_id: 'r1', event_id: 'e1', character_id: 'ch1', character_name: 'Aelira', dice: 'd20', count: 1, modifier: 0, results: [20], total: 20, outcome: 'critical_success', is_test: false }
    rpc.mockResolvedValueOnce({ data: result, error: null })
    await expect(performDiceRoll({ campaign_id: 'c1', dice: 'd20' })).resolves.toEqual(result)
  })
})

describe('requestRoll', () => {
  it('traduz erro de permissão para não-administrador', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'FORBIDDEN', code: '42501' } })
    await expect(requestRoll({ campaign_id: 'c1', character_id: 'ch1', attribute: 'strength' })).rejects.toThrow('Apenas o administrador da campanha pode solicitar rolagens.')
  })
})
