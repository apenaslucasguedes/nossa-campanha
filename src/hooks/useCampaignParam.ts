import { useCallback, useEffect, useState } from 'react'
import type { CampaignDashboard } from '../data/campaigns'
import { getCampaignDashboard } from '../data/campaignsList'
import { useCampaignRealtime } from './useCampaignRealtime'

/** Loads a campaign dashboard for an explicit campaignId (route param) and keeps it live via realtime. */
export function useCampaignParam(campaignId: string | undefined, userId?: string) {
  const [data, setData] = useState<CampaignDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!campaignId || !userId) return
    try {
      setError(null)
      setData(await getCampaignDashboard(campaignId, userId))
    } catch {
      setError('Não foi possível carregar a campanha.')
    } finally {
      setLoading(false)
    }
  }, [campaignId, userId])

  useEffect(() => { void refresh() }, [refresh])
  useCampaignRealtime(campaignId, refresh)

  return { data, loading, error, refresh }
}
