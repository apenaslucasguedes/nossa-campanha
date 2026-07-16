import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listMyCampaigns } from '../data/campaignsList'
import { readLastCampaign } from '../data/lastCampaign'
import { LoadingState } from '../components/States'

/** Resolves an old flat route (/campanha, /mesa, /mapa, /personagem) to the equivalent campaign-scoped route. */
export function LegacyCampaignRedirect({ suffix }: { suffix: string }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [campaignId, setCampaignId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!userId) return
    const remembered = readLastCampaign(userId)
    if (remembered) { setCampaignId(remembered); return }
    void listMyCampaigns(userId).then((campaigns) => setCampaignId(campaigns[0]?.campaign.id ?? null))
  }, [userId])

  if (campaignId === undefined) return <LoadingState />
  if (!campaignId) return <Navigate to="/campanhas" replace />
  return <Navigate to={`/campanhas/${campaignId}${suffix}`} replace />
}
