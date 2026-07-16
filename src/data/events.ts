import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { CampaignEvent } from '../types/database'

export type EventFilter = { sessionId?: string | null; includeTests?: boolean; includeArchived?: boolean; onlyTypes?: string[] }

const PAGE_SIZE = 30

export async function loadEventsPage(campaignId: string, filter: EventFilter, beforeSequence?: number): Promise<CampaignEvent[]> {
  let query = supabase.from('campaign_events').select('*').eq('campaign_id', campaignId).order('sequence', { ascending: false }).limit(PAGE_SIZE)
  if (filter.sessionId) query = query.eq('session_id', filter.sessionId)
  if (!filter.includeTests) query = query.eq('is_test', false)
  if (!filter.includeArchived) query = query.eq('is_archived', false)
  if (filter.onlyTypes?.length) query = query.in('event_type', filter.onlyTypes)
  if (beforeSequence !== undefined) query = query.lt('sequence', beforeSequence)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CampaignEvent[]
}

export async function archiveEvent(eventId: string) {
  const { error } = await supabase.from('campaign_events').update({ is_archived: true }).eq('id', eventId)
  if (error) { if (error.code === '42501') throw new Error('Apenas o administrador pode arquivar eventos.'); throw new Error('Não foi possível arquivar o evento.') }
}

export async function getEventPrefs(campaignId: string, userId: string): Promise<number> {
  const { data, error } = await supabase.from('campaign_event_prefs').select('hidden_before_sequence').eq('campaign_id', campaignId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.hidden_before_sequence ?? 0
}

export async function setHiddenBefore(campaignId: string, userId: string, sequence: number) {
  const { error } = await supabase.from('campaign_event_prefs').upsert({ campaign_id: campaignId, user_id: userId, hidden_before_sequence: sequence, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function resetHiddenBefore(campaignId: string, userId: string) {
  await setHiddenBefore(campaignId, userId, 0)
}

export function subscribeToEvents(campaignId: string, onInsert: (event: CampaignEvent) => void): RealtimeChannel {
  return supabase.channel(`events:${campaignId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_events', filter: `campaign_id=eq.${campaignId}` }, (payload) => onInsert(payload.new as CampaignEvent))
    .subscribe()
}
