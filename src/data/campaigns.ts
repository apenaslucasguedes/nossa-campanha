import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AvatarOptions, Campaign, CampaignMember, Character, CharacterState, ClassKey, Attributes, Specialty } from '../types/database'

export type CampaignDashboard = { campaign: Campaign; members: CampaignMember[]; characters: Character[]; currentRole: CampaignMember['role'] | null }
export async function getMyCampaign(userId: string): Promise<CampaignDashboard | null> {
  const { data: membership, error: memberError } = await supabase.from('campaign_members').select('*').eq('user_id', userId).limit(1).maybeSingle()
  if (memberError) throw memberError
  if (!membership) return null
  const [{ data: campaign, error: campaignError }, { data: members, error: membersError }, { data: characters, error: charsError }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', membership.campaign_id).single(),
    supabase.from('campaign_members').select('*').eq('campaign_id', membership.campaign_id).order('seat'),
    supabase.from('characters').select('*, character_states(*), character_conditions(*), character_specialties(*)').eq('campaign_id', membership.campaign_id).order('created_at'),
  ])
  if (campaignError || membersError || charsError) throw campaignError ?? membersError ?? charsError
  return { campaign, members, characters: (characters ?? []) as unknown as Character[], currentRole: membership.role }
}
export type CreateCharacterInput={name:string;class_key:ClassKey;presentation:string;origin:string;appearance:string;personality:string;objective:string;fear:string;bond:string;attributes:Attributes;specialties:Specialty[];avatar:AvatarOptions}
export async function createMyCharacter(input:CreateCharacterInput){const {data,error}=await supabase.rpc('create_my_character',{payload:input});if(error){if(error.message.includes('CHARACTER_EXISTS')||error.code==='23505')throw new Error('Você já possui um personagem nesta campanha.');if(error.code==='42501')throw new Error('Sua sessão ou vínculo com a campanha não permite esta criação.');if(error.message.includes('INVALID_'))throw new Error('Revise as escolhas da ficha antes de criar.');throw new Error('Não foi possível concluir a criação. Nenhum registro parcial foi mantido.')}return data}
export async function updateMyCharacter(characterId:string,changes:Pick<Character,'presentation'|'origin'|'appearance'|'personality'|'objective'|'fear'|'current_bond'|'avatar'>){const {error}=await supabase.from('characters').update({...changes,updated_at:new Date().toISOString()}).eq('id',characterId);if(error){if(error.code==='42501')throw new Error('Você não tem permissão para editar esta ficha.');throw new Error('As alterações não foram salvas. Verifique sua conexão.')}}
export async function updateCharacterState(characterId: string, state: Pick<CharacterState, 'vitality_current' | 'resource_current'>, userId: string) {
  const { error } = await supabase.from('character_states').update({ ...state, updated_by: userId, updated_at: new Date().toISOString() }).eq('character_id', characterId)
  if (error) throw error
}
export async function addCondition(characterId: string, name: string, userId: string) { const clean = name.trim().slice(0, 60); if (!clean) return; const { error } = await supabase.from('character_conditions').insert({ character_id: characterId, name: clean, created_by: userId }); if (error) throw error }
export async function removeCondition(conditionId: string) { const { error } = await supabase.from('character_conditions').delete().eq('id', conditionId); if (error) throw error }
export function subscribeToCharacterUpdates(campaignId: string, onChange: () => void): RealtimeChannel {
  return supabase.channel(`campaign:${campaignId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'character_states' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'character_conditions' }, onChange).subscribe()
}
