// Lógica pura da fase 1 da conexão do GPT Mestre (sem imports específicos do
// Deno), para permanecer testável por vitest. As Edge Functions em
// campaign-snapshot/index.ts e request-dice-roll/index.ts são adaptadores
// finos que constroem o cliente Supabase (com a anon key, nunca service_role)
// e delegam a decisão para as funções abaixo.
import { ApiError, GPT_KEY_HEADER, extractGptKey, gptRpcError, sha256Hex, validateGptRollRequest, type GptRollRequestInput } from './contracts.ts'

export type RpcCaller = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>
export type GptResult = { ok: true; data: unknown; summary: string } | { ok: false; error: ApiError }

function missingKeyError(): ApiError {
  return new ApiError('UNAUTHENTICATED', `Cabeçalho ${GPT_KEY_HEADER} é obrigatório.`, 401)
}

export async function resolveCampaignSnapshot(request: Request, rpc: RpcCaller): Promise<GptResult> {
  const rawKey = extractGptKey(request)
  if (!rawKey) return { ok: false, error: missingKeyError() }
  const keyHash = await sha256Hex(rawKey)
  const { data, error } = await rpc('get_campaign_snapshot_for_gpt', { lookup_key_hash: keyHash })
  if (error) return { ok: false, error: gptRpcError(error) }
  return { ok: true, data, summary: 'Snapshot multicampanha da campanha vinculada à chave.' }
}

export async function resolveDiceRollRequest(request: Request, rawBody: unknown, rpc: RpcCaller): Promise<GptResult> {
  const rawKey = extractGptKey(request)
  if (!rawKey) return { ok: false, error: missingKeyError() }
  if (!validateGptRollRequest(rawBody)) {
    return { ok: false, error: new ApiError('INVALID_ACTION', 'Personagem, atributo/especialidade, dificuldade ou motivo inválidos.') }
  }
  const input: GptRollRequestInput = rawBody
  const keyHash = await sha256Hex(rawKey)
  const { data, error } = await rpc('request_dice_roll_for_gpt', { lookup_key_hash: keyHash, payload: input })
  if (error) return { ok: false, error: gptRpcError(error) }
  return { ok: true, data, summary: 'Rolagem solicitada; aguardando o jogador rolar no site.' }
}
