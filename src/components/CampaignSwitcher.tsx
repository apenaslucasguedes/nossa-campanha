import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listMyCampaigns, type CampaignSummary } from '../data/campaignsList'
import { rememberLastCampaign } from '../data/lastCampaign'
import { Icon } from './Icon'

export function CampaignSwitcher() {
  const { session } = useAuth()
  const userId = session?.user.id
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])

  useEffect(() => { if (userId) void listMyCampaigns(userId).then(setCampaigns) }, [userId, campaignId])

  if (!campaigns.length) return null

  function change(nextId: string) {
    if (!nextId || nextId === campaignId) return
    if (userId) rememberLastCampaign(userId, nextId)
    navigate(`/campanhas/${nextId}`)
  }

  return (
    <label className="campaign-switcher" aria-label="Trocar de campanha">
      <Icon name="campanhas" size={18} decorative />
      <select value={campaignId ?? ''} onChange={(event) => change(event.target.value)}>
        {campaigns.map((item) => <option key={item.campaign.id} value={item.campaign.id}>{item.campaign.name}</option>)}
      </select>
    </label>
  )
}
