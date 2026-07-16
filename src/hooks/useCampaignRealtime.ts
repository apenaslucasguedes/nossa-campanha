import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting'

const TABLES_WITH_CAMPAIGN_FILTER = [
  'campaigns', 'campaign_locations', 'combat_sessions', 'game_actions',
  'campaign_events', 'roll_requests', 'dice_rolls', 'campaign_sessions',
] as const

const TABLES_WITHOUT_FILTER = ['character_states', 'character_conditions', 'combat_participants', 'enemy_instances'] as const

/**
 * Single realtime channel per campaign. Unsubscribes automatically when campaignId changes
 * or the component unmounts, so switching campaigns never leaves a stale subscription behind.
 */
export function useCampaignRealtime(campaignId: string | undefined, onChange: () => void) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!campaignId) return
    setStatus('connecting')
    const channel = supabase.channel(`campaign-live:${campaignId}`)
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
