import { useCallback, useEffect, useState } from 'react'
import { getMyCampaign, subscribeToCharacterUpdates, type CampaignDashboard } from '../data/campaigns'
import { supabase } from '../lib/supabase'

export function useCampaign(userId?: string) {
  const [data, setData] = useState<CampaignDashboard | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => { if (!userId) return; try { setError(null); setData(await getMyCampaign(userId)) } catch { setError('Não foi possível carregar a campanha.') } finally { setLoading(false) } }, [userId])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { if (!data?.campaign.id) return; const channel = subscribeToCharacterUpdates(data.campaign.id, () => void refresh()); return () => { void supabase.removeChannel(channel) } }, [data?.campaign.id, refresh])
  return { data, loading, error, refresh }
}
