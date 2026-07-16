import { supabase } from '../lib/supabase'
import type { CampaignEvent, RollRequest } from '../types/database'
import { getActiveSession } from './sessions'
import { combatRepository } from './combat'

export type CampaignSnapshot = {
  campaign: unknown
  active_session: unknown
  characters: unknown[]
  locations: unknown[]
  active_combat: unknown
  pending_roll_requests: RollRequest[]
  recent_events: CampaignEvent[]
  last_sequence: number | null
}

export async function loadCampaignSnapshot(campaignId: string): Promise<CampaignSnapshot> {
  const { data, error } = await supabase.rpc('get_campaign_snapshot', { target_campaign: campaignId })
  if (error) throw error
  return data as unknown as CampaignSnapshot
}

export async function loadEventsSince(campaignId: string, cursor: number): Promise<CampaignEvent[]> {
  const { data, error } = await supabase.from('campaign_events').select('*').eq('campaign_id', campaignId).eq('is_test', false).eq('is_archived', false).gt('sequence', cursor).order('sequence', { ascending: true })
  if (error) throw error
  return (data ?? []) as CampaignEvent[]
}

export async function loadPendingRollRequests(campaignId: string): Promise<RollRequest[]> {
  const { data, error } = await supabase.from('roll_requests').select('*').eq('campaign_id', campaignId).eq('status', 'pending')
  if (error) throw error
  return (data ?? []) as RollRequest[]
}

export async function loadCombatState(campaignId: string) {
  return combatRepository.load(campaignId)
}

export async function loadActiveSession(campaignId: string) {
  return getActiveSession(campaignId)
}
