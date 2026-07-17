import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting'

const TABLES_WITH_CAMPAIGN_FILTER = [
  'campaign_locations', 'combat_sessions', 'game_actions',
  'campaign_events', 'roll_requests', 'dice_rolls', 'campaign_sessions',
] as const

const TABLES_WITHOUT_FILTER = ['character_states', 'character_conditions', 'combat_participants', 'enemy_instances'] as const
let nextChannelInstance = 0

/**
 * Single realtime channel per campaign. Unsubscribes automatically when campaignId changes
 * or the component unmounts, so switching campaigns never leaves a stale subscription behind.
 */
export function useCampaignRealtime(campaignId: string | undefined, onChange: () => void) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const onChangeRef = useRef(onChange)
  const instanceRef = useRef<number | null>(null)
  if (instanceRef.current === null) instanceRef.current = ++nextChannelInstance
  onChangeRef.current = onChange

  useEffect(() => {
    if (!campaignId) return
    setStatus('connecting')
    // Supabase reuses channels with the same topic. Campaign and Settings can be
    // mounted together, so each hook instance needs its own topic before adding
    // postgres_changes callbacks.
    const channel = supabase.channel(`campaign-live:${campaignId}:${instanceRef.current}`)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` }, () => onChangeRef.current())
    for (const table of TABLES_WITH_CAMPAIGN_FILTER) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `campaign_id=eq.${campaignId}` }, () => onChangeRef.current())
    }
    for (const table of TABLES_WITHOUT_FILTER) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChangeRef.current())
    }
    channel.subscribe((channelStatus) => {
      if (channelStatus === 'SUBSCRIBED') setStatus('connected')
      else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') setStatus('reconnecting')
    })
    return () => { void supabase.removeChannel(channel) }
  }, [campaignId])

  return status
}
