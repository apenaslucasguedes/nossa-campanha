import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Attributes, AvatarOptions, Campaign, CampaignLocation, CampaignMember, Character, CharacterState, ClassKey, Profile, RegionId, Specialty } from '../types/database'

export type CampaignDashboard = { campaign: Campaign; members: CampaignMember[]; characters: Character[]; locations: CampaignLocation[]; currentRole: CampaignMember['role'] | null; currentProfile: Profile | null }
export async function getMyCampaign(userId: string): Promise<CampaignDashboard | null> {
  const { data: membership, error: memberError } = await supabase.from('campaign_members').select('*').eq('user_id', userId).limit(1).maybeSingle()
  if (memberError) throw memberError
  if (!membership) return null
  const [{ data: campaign, error: campaignError }, { data: members, error: membersError }, { data: characters, error: charsError }, { data: locations, error: locationsError }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', membership.campaign_id).single(),
    supabase.from('campaign_members').select('*').eq('campaign_id', membership.campaign_id).order('seat'),
    supabase.from('characters').select('*, character_states(*), character_conditions(*), character_specialties(*)').eq('campaign_id', membership.campaign_id).order('created_at'),
    supabase.from('campaign_locations').select('*').eq('campaign_id', membership.campaign_id).eq('revealed', true).order('name'),
  ])
  if (campaignError || membersError || charsError || locationsError) throw campaignError ?? membersError ?? charsError ?? locationsError
  const userIds = (members ?? []).map((member) => member.user_id)
  const { data: profiles, error: profilesError } = userIds.length ? await supabase.from('profiles').select('id, display_name, gpt_master_url, created_at, updated_at').in('id', userIds) : { data: [], error: null }
  if (profilesError) throw profilesError
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as Profile]))
  return { campaign, members: (members ?? []).map((member) => ({ ...member, profile: profileMap.get(member.user_id) ?? null })), characters: (characters ?? []) as unknown as Character[], locations: (locations ?? []) as CampaignLocation[], currentRole: membership.role, currentProfile: profileMap.get(userId) ?? null }
}
export type CampaignContextInput = Pick<Campaign, 'name'|'status'|'premise'|'current_summary'|'current_region_id'|'last_session_summary'|'active_objectives'|'important_notes'>
export async function updateCampaignContext(campaignId: string, input: CampaignContextInput) {
  const { error } = await supabase.from('campaigns').update({ ...input, updated_at: new Date().toISOString() }).eq('id', campaignId)
  if (error) { if (error.code === '42501') throw new Error('Voce nao tem permissao para editar a campanha.'); throw new Error('Nao foi possivel salvar o contexto da campanha.') }
}
export async function updateCampaignRegion(campaignId: string, regionId: RegionId | null) {
  const { error } = await supabase.from('campaigns').update({ current_region_id: regionId, updated_at: new Date().toISOString() }).eq('id', campaignId)
  if (error) { if (error.code === '42501') throw new Error('Voce nao tem permissao para alterar a regiao.'); throw new Error('Nao foi possivel salvar a regiao atual.') }
}
export async function getGptMasterUrl(userId: string) {
  const { data, error } = await supabase.from('profiles').select('gpt_master_url').eq('id', userId).single()
  if (error) throw error
  return data.gpt_master_url
}
export async function updateGptMasterUrl(userId: string, url: string | null) {
  const { error } = await supabase.from('profiles').update({ gpt_master_url: url, updated_at: new Date().toISOString() }).eq('id', userId)
  if (error) throw new Error('Nao foi possivel salvar a URL do GPT Mestre.')
}
export type CreateCharacterInput={name:string;class_key:ClassKey;presentation:string;origin:string;appearance:string;personality:string;objective:string;fear:string;bond:string;attributes:Attributes;specialties:Specialty[];avatar:AvatarOptions}
export async function createMyCharacter(input:CreateCharacterInput){const {data,error}=await supabase.rpc('create_my_character',{payload:input});if(error){if(error.message.includes('CHARACTER_EXISTS')||error.code==='23505')throw new Error('Você já possui um personagem nesta campanha.');if(error.code==='42501')throw new Error('Sua sessão ou vínculo com a campanha não permite esta criação.');if(error.message.includes('INVALID_'))throw new Error('Revise as escolhas da ficha antes de criar.');throw new Error('Não foi possível concluir a criação. Nenhum registro parcial foi mantido.')}return data}
export async function updateMyCharacter(characterId:string,changes:Pick<Character,'presentation'|'origin'|'appearance'|'personality'|'objective'|'fear'|'current_bond'|'avatar'>){const {error}=await supabase.from('characters').update({...changes,updated_at:new Date().toISOString()}).eq('id',characterId);if(error){if(error.code==='42501')throw new Error('Você não tem permissão para editar esta ficha.');throw new Error('As alterações não foram salvas. Verifique sua conexão.')}}
export async function deleteMyCharacter(characterId: string) {
  const { error } = await supabase.from('characters').delete().eq('id', characterId)
  if (error) { if (error.code === '42501') throw new Error('Você não tem permissão para apagar esta ficha.'); throw new Error('Não foi possível apagar o personagem. Verifique sua conexão.') }
}
export async function updateCharacterState(characterId: string, state: Pick<CharacterState, 'vitality_current' | 'resource_current'>, userId: string) {
  const { error } = await supabase.from('character_states').update({ ...state, updated_by: userId, updated_at: new Date().toISOString() }).eq('character_id', characterId)
  if (error) throw error
}
export async function addCondition(characterId: string, name: string, userId: string) { const clean = name.trim().slice(0, 60); if (!clean) return; const { error } = await supabase.from('character_conditions').insert({ character_id: characterId, name: clean, created_by: userId }); if (error) throw error }
export async function removeCondition(conditionId: string) { const { error } = await supabase.from('character_conditions').delete().eq('id', conditionId); if (error) throw error }
export function subscribeToCharacterUpdates(campaignId: string, onChange: () => void): RealtimeChannel {
  return supabase.channel(`campaign:${campaignId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_locations', filter: `campaign_id=eq.${campaignId}` }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'character_states' }, onChange).on('postgres_changes', { event: '*', schema: 'public', table: 'character_conditions' }, onChange).subscribe()
}
