import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { CampaignSession } from '../types/database'

export async function getActiveSession(campaignId: string): Promise<CampaignSession | null> {
  const { data, error } = await supabase.from('campaign_sessions').select('*').eq('campaign_id', campaignId).eq('status', 'active').maybeSingle()
  if (error) throw error
  return data as CampaignSession | null
}

export async function listSessions(campaignId: string): Promise<CampaignSession[]> {
  const { data, error } = await supabase.from('campaign_sessions').select('*').eq('campaign_id', campaignId).order('number', { ascending: false })
  if (error) throw error
  return (data ?? []) as CampaignSession[]
}

export async function startCampaignSession(campaignId: string, title = ''): Promise<CampaignSession> {
  const { data, error } = await supabase.rpc('start_campaign_session', { target_campaign: campaignId, session_title: title })
  if (error) { if (error.code === '42501') throw new Error('Apenas o administrador da campanha pode iniciar uma nova sessão.'); throw new Error('Não foi possível iniciar a nova sessão.') }
  return data as CampaignSession
}

export function subscribeToSessions(campaignId: string, onChange: () => void): RealtimeChannel {
  return supabase.channel(`sessions:${campaignId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_sessions', filter: `campaign_id=eq.${campaignId}` }, onChange)
    .subscribe()
}
