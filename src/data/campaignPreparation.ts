import { supabase } from '../lib/supabase'

export type CampaignPreparationResult = {
  archived_campaign_id: string
  new_campaign_id: string
  character_map: Record<string, string>
}

export async function prepareCleanCampaignCopy(campaignId: string, campaignName: string, requestId: string): Promise<CampaignPreparationResult> {
  const { data, error } = await supabase.rpc('prepare_clean_campaign_copy', {
    p_source_campaign_id: campaignId,
    p_new_campaign_name: campaignName,
    p_request_id: requestId,
  })
  if (error) {
    if (error.code === '42501') throw new Error('Somente o administrador da mesa pode preparar a campanha.')
    throw new Error('Não foi possível criar a campanha limpa. Nenhuma alteração foi concluída.')
  }
  return data as unknown as CampaignPreparationResult
}
