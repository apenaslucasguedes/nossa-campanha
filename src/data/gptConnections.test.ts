import { describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }))

const { createGptConnection, listGptConnections, revokeGptConnection, GPT_CONNECTION_PERMISSIONS } = await import('./gptConnections')

describe('GPT_CONNECTION_PERMISSIONS', () => {
  it('e fechado em read_snapshot e request_roll', () => {
    expect(GPT_CONNECTION_PERMISSIONS).toEqual(['read_snapshot', 'request_roll'])
  })
})

describe('listGptConnections', () => {
  it('chama a RPC de listagem com o campaign_id', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null })
    await listGptConnections('camp-1')
    expect(rpc).toHaveBeenCalledWith('list_gpt_campaign_connections', { p_campaign_id: 'camp-1' })
  })

  it('nunca inclui key_hash no retorno', async () => {
    const row = { id: 'conn-1', campaign_id: 'camp-1', label: 'GPT principal', permissions: ['read_snapshot', 'request_roll'], created_at: '2026-07-16T00:00:00.000Z', last_used_at: null, revoked_at: null }
    rpc.mockResolvedValueOnce({ data: [row], error: null })
    const result = await listGptConnections('camp-1')
    expect(result).toEqual([row])
    expect(Object.keys(result[0])).not.toContain('key_hash')
  })

  it('traduz erro de permissao para nao-administrador', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'FORBIDDEN', code: '42501' } })
    await expect(listGptConnections('camp-1')).rejects.toThrow('Apenas o administrador da campanha pode ver as conexões do GPT.')
  })

  it('traduz erro generico', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'MIGRATION_REQUIRED', code: '42P01' } })
    await expect(listGptConnections('camp-1')).rejects.toThrow('Não foi possível carregar as conexões do GPT.')
  })
})

describe('createGptConnection', () => {
  it('cria a conexao com permissoes fixas, sem permitir escolha adicional', async () => {
    const created = { id: 'conn-1', raw_key: 'rlk_abc123', label: 'GPT principal', permissions: ['read_snapshot', 'request_roll'], created_at: '2026-07-16T00:00:00.000Z' }
    rpc.mockResolvedValueOnce({ data: created, error: null })
    const result = await createGptConnection('camp-1', 'GPT principal')
    expect(rpc).toHaveBeenCalledWith('create_gpt_campaign_connection', { target_campaign: 'camp-1', connection_label: 'GPT principal', connection_permissions: ['read_snapshot', 'request_roll'] })
    expect(result).toEqual(created)
  })

  it('traduz erro de permissao para nao-administrador', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'FORBIDDEN', code: '42501' } })
    await expect(createGptConnection('camp-1', 'GPT principal')).rejects.toThrow('Apenas o administrador da campanha pode criar conexões do GPT.')
  })

  it('traduz rotulo invalido', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'INVALID_LABEL', code: '22023' } })
    await expect(createGptConnection('camp-1', '')).rejects.toThrow('Informe um nome válido para a conexão.')
  })
})

describe('revokeGptConnection', () => {
  it('chama a RPC de revogacao com o id da conexao', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    await revokeGptConnection('conn-1')
    expect(rpc).toHaveBeenCalledWith('revoke_gpt_campaign_connection', { target_connection: 'conn-1' })
  })

  it('traduz alvo invalido', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'INVALID_TARGET', code: 'P0002' } })
    await expect(revokeGptConnection('conn-x')).rejects.toThrow('Conexão não encontrada.')
  })

  it('traduz erro de permissao para nao-administrador', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'FORBIDDEN', code: '42501' } })
    await expect(revokeGptConnection('conn-1')).rejects.toThrow('Apenas o administrador da campanha pode revogar conexões do GPT.')
  })
})
