import { describe, expect, it, vi } from 'vitest'
import { GPT_KEY_HEADER } from './contracts'
import { resolveCampaignSnapshot, resolveDiceRollRequest, type RpcCaller } from './gptHandlers'

const character_id = '33333333-3333-4333-8333-333333333333'
const campaign_id = '11111111-1111-4111-8111-111111111111'
const otherCampaignId = '22222222-2222-4222-8222-222222222222'

function requestWithKey(key: string | null) {
  return new Request('https://x/campaign-snapshot', { method: 'POST', headers: key ? { [GPT_KEY_HEADER]: key } : {} })
}

describe('resolveCampaignSnapshot', () => {
  it('rejeita quando o cabeçalho X-Relicario-Key está ausente (chave inválida)', async () => {
    const rpc: RpcCaller = vi.fn()
    const result = await resolveCampaignSnapshot(requestWithKey(null), rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) { expect(result.error.code).toBe('UNAUTHENTICATED'); expect(result.error.status).toBe(401) }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejeita uma chave desconhecida (chave inválida)', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: null, error: { message: 'GPT_KEY_INVALID', code: '42501' } })
    const result = await resolveCampaignSnapshot(requestWithKey('rlk_desconhecida'), rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNAUTHENTICATED')
  })

  it('rejeita uma chave revogada com o mesmo código de chave inválida, sem distinguir o motivo ao chamador', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: null, error: { message: 'GPT_KEY_INVALID', code: '42501' } })
    const result = await resolveCampaignSnapshot(requestWithKey('rlk_revogada'), rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNAUTHENTICATED')
  })

  it('rejeita quando a chave não tem a permissão read_snapshot', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: null, error: { message: 'GPT_KEY_FORBIDDEN', code: '42501' } })
    const result = await resolveCampaignSnapshot(requestWithKey('rlk_sem_permissao'), rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) { expect(result.error.code).toBe('FORBIDDEN'); expect(result.error.status).toBe(403) }
  })

  it('retorna o snapshot completo com chave válida, hasheando a chave antes de chamar a RPC', async () => {
    const snapshot = { campaign: { id: campaign_id, name: 'Relicário', current_region_id: 'vale-de-ardan', premise: 'x' }, active_session: { id: 's1', number: 1 }, characters: [], locations: [], active_combat: null, pending_roll_requests: [], recent_dice_rolls: [], recent_events: [], last_sequence: 5 }
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: snapshot, error: null })
    const result = await resolveCampaignSnapshot(requestWithKey('rlk_valida'), rpc)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(snapshot)
    const [fnName, args] = (rpc as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(fnName).toBe('get_campaign_snapshot_for_gpt')
    expect(args.lookup_key_hash).not.toBe('rlk_valida')
    expect(args.lookup_key_hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('resolveDiceRollRequest', () => {
  const validBody = { character_id, attribute: 'presence', specialty: 'Persuasão', reason: 'Convencer o guarda', difficulty: 12 }

  it('rejeita quando o cabeçalho está ausente', async () => {
    const rpc: RpcCaller = vi.fn()
    const result = await resolveDiceRollRequest(new Request('https://x/request-dice-roll', { method: 'POST' }), validBody, rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNAUTHENTICATED')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejeita corpo estruturalmente inválido antes de chamar a RPC', async () => {
    const rpc: RpcCaller = vi.fn()
    const result = await resolveDiceRollRequest(requestWithKey('rlk_valida'), { character_id: 'nao-e-uuid' }, rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_ACTION')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('propaga campanha diferente da vinculada à chave como proibido', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: null, error: { message: 'CAMPAIGN_MISMATCH', code: '42501' } })
    const result = await resolveDiceRollRequest(requestWithKey('rlk_valida'), { ...validBody, campaign_id: otherCampaignId }, rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN')
  })

  it('propaga personagem de outro usuário/campanha como alvo inválido', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: null, error: { message: 'INVALID_TARGET', code: 'P0002' } })
    const result = await resolveDiceRollRequest(requestWithKey('rlk_valida'), validBody, rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_TARGET')
  })

  it('propaga ausência de sessão ativa como conflito', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: null, error: { message: 'SESSION_INACTIVE', code: 'P0001' } })
    const result = await resolveDiceRollRequest(requestWithKey('rlk_valida'), validBody, rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('CONFLICT')
  })

  it('rejeita quando a chave não tem a permissão request_roll', async () => {
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: null, error: { message: 'GPT_KEY_FORBIDDEN', code: '42501' } })
    const result = await resolveDiceRollRequest(requestWithKey('rlk_somente_leitura'), validBody, rpc)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN')
  })

  it('registra a solicitação de rolagem com chave válida e nunca chama perform_dice_roll', async () => {
    const rollRequest = { id: 'rr1', campaign_id, session_id: 's1', requested_character_id: character_id, status: 'pending' }
    const rpc: RpcCaller = vi.fn().mockResolvedValue({ data: rollRequest, error: null })
    const result = await resolveDiceRollRequest(requestWithKey('rlk_valida'), validBody, rpc)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(rollRequest)
    const [fnName] = (rpc as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(fnName).toBe('request_dice_roll_for_gpt')
    expect(rpc).not.toHaveBeenCalledWith('perform_dice_roll', expect.anything())
  })
})
