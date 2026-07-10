import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Campaign, CampaignMember, Character, CharacterState } from '../types/database'

export type CampaignDashboard = { campaign: Campaign; members: CampaignMember[]; characters: Character[]; currentRole: CampaignMember['role'] | null }
export async function getMyCampaign(userId: string): Promise<CampaignDashboard | null> {
  const { data: membership, error: memberError } = await supabase.from('campaign_members').select('*').eq('user_id', userId).limit(1).maybeSingle()
  if (memberError) throw memberError
  if (!membership) return null
  const [{ data: campaign, error: campaignError }, { data: members, error: membersError }, { data: characters, error: charsError }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', membership.campaign_id).single(),
    supabase.from('campaign_members').select('*').eq('campaign_id', membership.campaign_id).order('seat'),
    supabase.from('characters').select('*, character_states(*), character_conditions(*)').eq('campaign_id', membership.campaign_id).order('created_at'),
  ])
  if (campaignError || membersError || charsError) throw campaignError ?? membersError ?? charsError
  return { campaign, members, characters: (characters ?? []) as unknown as Character[], currentRole: membership.role }
}
export async function updateCharacterState(characterId: string, state: Pick<CharacterState, 'vitality_current' | 'resource_current'>, userId: string) {
  const { error } = await supabase.from('character_states').update({ ...state, updated_by: userId, updated_at: new Date().toISOString() }).eq('character_id', characterId)
  if (error) throw error
}
export async function addCondition(characterId: string, name: string, userId: string) { const clean = name.trim().slice(0, 60); if (!clean) return; const { error } = await supabase.from('character_conditions').insert({ character_id: characterId, name: clean, created_by: userId }); if (error) throw error }
export async function removeCondition(conditionId: string) { const { error } = await supabase.from('character_conditions').delete().eq('id', conditionId); if (error) throw error }
export function subscribeToCharacterUpdates(campaignId: string, onChange: () => void): RealtimeChannel {
  return supabase.channel(`campaign:${campaignId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'character_states' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'character_conditions' }, onChange).subscribe()
}
