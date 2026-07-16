import { describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
const on = vi.fn().mockReturnThis()
const subscribe = vi.fn().mockReturnThis()
const channel = vi.fn((_topic: string) => ({ on, subscribe }))
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args), channel } }))

const { performDiceRoll, requestRoll, subscribeToRollRequests } = await import('./rolls')

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

describe('subscribeToRollRequests', () => {
  it('usa tópicos distintos por assinante para não colidir quando dois componentes assinam a mesma campanha', () => {
    // Regressão: DiceRollWidget e RollRequestPanel assinam roll_requests da mesma campanha ao mesmo tempo
    // na Mesa (visão de admin). Se ambos usassem o mesmo tópico de canal, o Supabase reaproveitaria o
    // canal já inscrito e o segundo `.on()` lançaria "cannot add postgres_changes callbacks ... after
    // subscribe()" de forma síncrona e não tratada, derrubando a árvore React inteira (tela preta).
    subscribeToRollRequests('camp-1', () => {}, 'player')
    subscribeToRollRequests('camp-1', () => {}, 'admin')
    const topics = channel.mock.calls.map((call) => call[0])
    expect(new Set(topics).size).toBe(topics.length)
    expect(topics).toEqual(['roll-requests:camp-1:player', 'roll-requests:camp-1:admin'])
  })
})
