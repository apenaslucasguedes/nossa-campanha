import { useEffect, useRef, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (userId) void listMyCampaigns(userId).then(setCampaigns) }, [userId, campaignId])
  useEffect(() => {
    function close(event: MouseEvent) { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [])

  if (!campaigns.length) return null

  function change(nextId: string) {
    if (!nextId || nextId === campaignId) return
    if (userId) rememberLastCampaign(userId, nextId)
    setOpen(false)
    navigate(`/campanhas/${nextId}`)
  }

  const current = campaigns.find((item) => item.campaign.id === campaignId) ?? campaigns[0]

  return (
    <div className="campaign-switcher" ref={rootRef}>
      <Icon name="campanhas" size={18} decorative />
      <button type="button" className="campaign-switcher__trigger" title={current.campaign.name} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>{current.campaign.name}</span><span aria-hidden="true">⌄</span></button>
      {open ? <div className="campaign-switcher__popover" role="listbox" aria-label="Trocar de campanha">{campaigns.map((item) => <button key={item.campaign.id} type="button" role="option" aria-selected={item.campaign.id === campaignId} title={item.campaign.name} onClick={() => change(item.campaign.id)}>{item.campaign.name}</button>)}</div> : null}
    </div>
  )
}
