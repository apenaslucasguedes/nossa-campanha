import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Attributes, DiceKind, RollRequest, Specialty } from '../types/database'

export type RequestRollInput = { campaign_id: string; character_id: string; attribute?: keyof Attributes; specialty?: Specialty; modifier?: number; reason?: string; difficulty?: number }

export async function requestRoll(input: RequestRollInput): Promise<RollRequest> {
  const { data, error } = await supabase.rpc('request_dice_roll', { payload: input })
  if (error) {
    if (error.code === '42501') throw new Error('Apenas o administrador da campanha pode solicitar rolagens.')
    if (error.message.includes('SESSION_INACTIVE')) throw new Error('Nenhuma sessão ativa nesta campanha.')
    if (error.message.includes('INVALID_TARGET')) throw new Error('Personagem inválido para esta campanha.')
    throw new Error('Não foi possível solicitar a rolagem.')
  }
  return data as RollRequest
}

export async function cancelRollRequest(requestId: string) {
  const { error } = await supabase.rpc('cancel_roll_request', { target_request: requestId })
  if (error) throw new Error('Não foi possível cancelar a solicitação.')
}

export type PerformRollInput = { campaign_id: string; dice: DiceKind; count?: number; modifier?: number; roll_request_id?: string; attribute?: keyof Attributes; specialty?: Specialty; difficulty?: number; is_test?: boolean; label?: string }
export type PerformRollResult = { roll_id: string; event_id: string; character_id: string; character_name: string; dice: DiceKind; count: number; modifier: number; results: number[]; total: number; outcome: string | null; is_test: boolean }

export async function performDiceRoll(input: PerformRollInput): Promise<PerformRollResult> {
  const { data, error } = await supabase.rpc('perform_dice_roll', { payload: input })
  if (error) {
    if (error.message.includes('NOT_YOUR_CHARACTER')) throw new Error('Esta rolagem pertence a outro personagem.')
    if (error.message.includes('NO_CHARACTER_SEATED')) throw new Error('Você não possui um personagem nesta campanha.')
    if (error.message.includes('SESSION_INACTIVE')) throw new Error('Nenhuma sessão ativa nesta campanha.')
    if (error.message.includes('INVALID_DICE')) throw new Error('Combinação de dados inválida.')
    throw new Error('Não foi possível registrar a rolagem.')
  }
  return data as unknown as PerformRollResult
}

export async function listPendingRollRequests(campaignId: string): Promise<RollRequest[]> {
  const { data, error } = await supabase.from('roll_requests').select('*').eq('campaign_id', campaignId).eq('status', 'pending').order('requested_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as RollRequest[]
}

export function subscribeToRollRequests(campaignId: string, onChange: () => void): RealtimeChannel {
  return supabase.channel(`roll-requests:${campaignId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'roll_requests', filter: `campaign_id=eq.${campaignId}` }, onChange)
    .subscribe()
}
