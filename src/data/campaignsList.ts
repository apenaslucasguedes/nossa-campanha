import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Campaign, CampaignLocation, CampaignMember, CampaignSession, Character, Profile, RegionId } from '../types/database'
import type { CampaignDashboard } from './campaigns'

export type CampaignSummary = { campaign: Campaign; members: CampaignMember[]; characters: Pick<Character, 'id' | 'name' | 'owner_id'>[]; activeSession: CampaignSession | null }

export async function listMyCampaigns(userId: string): Promise<CampaignSummary[]> {
  const { data: memberships, error: membershipError } = await supabase.from('campaign_members').select('*').eq('user_id', userId)
  if (membershipError) throw membershipError
  const campaignIds = (memberships ?? []).map((membership) => membership.campaign_id)
  if (!campaignIds.length) return []
  const [{ data: campaigns, error: campaignsError }, { data: members, error: membersError }, { data: characters, error: charsError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from('campaigns').select('*').in('id', campaignIds).order('created_at', { ascending: false }),
    supabase.from('campaign_members').select('*').in('campaign_id', campaignIds),
    supabase.from('characters').select('id, name, owner_id, campaign_id').in('campaign_id', campaignIds),
    supabase.from('campaign_sessions').select('*').in('campaign_id', campaignIds).eq('status', 'active'),
  ])
  if (campaignsError || membersError || charsError || sessionsError) throw campaignsError ?? membersError ?? charsError ?? sessionsError
  return (campaigns ?? []).map((campaign) => ({
    campaign,
    members: (members ?? []).filter((member) => member.campaign_id === campaign.id),
    characters: (characters ?? []).filter((character) => character.campaign_id === campaign.id),
    activeSession: (sessions ?? []).find((sessionRow) => sessionRow.campaign_id === campaign.id) ?? null,
  }))
}

export async function getCampaignDashboard(campaignId: string, userId: string): Promise<CampaignDashboard | null> {
  const { data: membership, error: membershipError } = await supabase.from('campaign_members').select('*').eq('campaign_id', campaignId).eq('user_id', userId).maybeSingle()
  if (membershipError) throw membershipError
  if (!membership) return null
  const [{ data: campaign, error: campaignError }, { data: members, error: membersError }, { data: characters, error: charsError }, { data: locations, error: locationsError }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', campaignId).single(),
    supabase.from('campaign_members').select('*').eq('campaign_id', campaignId).order('seat'),
    supabase.from('characters').select('*, character_states(*), character_conditions(*), character_specialties(*)').eq('campaign_id', campaignId).order('created_at'),
    supabase.from('campaign_locations').select('*').eq('campaign_id', campaignId).eq('revealed', true).order('name'),
  ])
  if (campaignError || membersError || charsError || locationsError) throw campaignError ?? membersError ?? charsError ?? locationsError
  const userIds = (members ?? []).map((member) => member.user_id)
  const { data: profiles, error: profilesError } = userIds.length ? await supabase.from('profiles').select('id, display_name, gpt_master_url, created_at, updated_at').in('id', userIds) : { data: [], error: null }
  if (profilesError) throw profilesError
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as Profile]))
  return {
    campaign: campaign as Campaign,
    members: (members ?? []).map((member) => ({ ...member, profile: profileMap.get(member.user_id) ?? null })),
    characters: (characters ?? []) as unknown as Character[],
    locations: (locations ?? []) as CampaignLocation[],
    currentRole: membership.role,
    currentProfile: profileMap.get(userId) ?? null,
  }
}

export type CreateCampaignInput = { name: string; premise?: string; region_id?: RegionId | null }

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const { data, error } = await supabase.rpc('create_campaign', { payload: input })
  if (error) { if (error.code === '22023') throw new Error('Informe um nome válido para a campanha.'); throw new Error('Não foi possível criar a campanha.') }
  return data as Campaign
}

export async function archiveCampaign(campaignId: string) {
  const { error } = await supabase.rpc('archive_campaign', { target_campaign: campaignId })
  if (error) { if (error.code === '42501') throw new Error('Você não tem permissão para arquivar esta campanha.'); throw new Error('Não foi possível arquivar a campanha.') }
}

export function subscribeToMyCampaignMemberships(userId: string, onChange: () => void): RealtimeChannel {
  return supabase.channel(`memberships:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_members', filter: `user_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, onChange)
    .subscribe()
}
