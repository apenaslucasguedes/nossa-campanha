import { supabase } from '../lib/supabase'
import type { GptCampaignConnection, GptCampaignConnectionCreated, GptConnectionPermission } from '../types/database'

export const GPT_CONNECTION_PERMISSIONS: readonly GptConnectionPermission[] = ['read_snapshot', 'request_roll']

export async function listGptConnections(campaignId: string): Promise<GptCampaignConnection[]> {
  const { data, error } = await supabase.rpc('list_gpt_campaign_connections', { p_campaign_id: campaignId })
  if (error) {
    if (error.code === '42501') throw new Error('Apenas o administrador da campanha pode ver as conexões do GPT.')
    throw new Error('Não foi possível carregar as conexões do GPT.')
  }
  return (data ?? []) as GptCampaignConnection[]
}

export async function createGptConnection(campaignId: string, label: string): Promise<GptCampaignConnectionCreated> {
  const { data, error } = await supabase.rpc('create_gpt_campaign_connection', {
    target_campaign: campaignId,
    connection_label: label,
    connection_permissions: [...GPT_CONNECTION_PERMISSIONS],
  })
  if (error) {
    if (error.code === '42501') throw new Error('Apenas o administrador da campanha pode criar conexões do GPT.')
    if (error.message.includes('INVALID_LABEL')) throw new Error('Informe um nome válido para a conexão.')
    if (error.message.includes('INVALID_PERMISSIONS')) throw new Error('Permissões inválidas para a conexão.')
    throw new Error('Não foi possível criar a conexão do GPT.')
  }
  return data as unknown as GptCampaignConnectionCreated
}

export async function revokeGptConnection(connectionId: string) {
  const { error } = await supabase.rpc('revoke_gpt_campaign_connection', { target_connection: connectionId })
  if (error) {
    if (error.code === '42501') throw new Error('Apenas o administrador da campanha pode revogar conexões do GPT.')
    if (error.message.includes('INVALID_TARGET')) throw new Error('Conexão não encontrada.')
    throw new Error('Não foi possível revogar a conexão do GPT.')
  }
}
