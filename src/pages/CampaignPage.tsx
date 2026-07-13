import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CampaignCard, PlayerSeat } from '../components/CampaignCard'
import { Icon } from '../components/Icon'
import { RegionArtwork } from '../components/RegionArtwork'
import { readPlayerName } from '../components/playerName'
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { useCampaign } from '../hooks/useCampaign'

function readCurrentRegion(campaign: unknown): string | undefined {
  if (!campaign || typeof campaign !== 'object') return undefined
  const record = campaign as Record<string, unknown>
  const region = record.current_region ?? record.region_name ?? record.region
  if (typeof region === 'string' && region.trim()) return region.trim()
  if (region && typeof region === 'object') {
    const name = (region as Record<string, unknown>).name
    if (typeof name === 'string' && name.trim()) return name.trim()
  }
  return undefined
}

export function CampaignPage() {
  const { session } = useAuth()
  const { data, loading, error } = useCampaign(session?.user.id)
  if (loading) return <LoadingState />

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Painel compartilhado" title="Campanha">Os dois assentos e o estado mecânico atual da mesa.</PageHeader>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <EmptyState title="Nenhuma campanha vinculada" icon="campanhas">Peça ao administrador para concluir o bootstrap dos dois usuários.</EmptyState>
      </>
    )
  }

  const region = readCurrentRegion(data.campaign)
  return (
    <div className="campaign-page">
      <PageHeader eyebrow="Painel compartilhado" title={data.campaign.name}>Consulte os dois protagonistas e o estado mecânico preservado da mesa.</PageHeader>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <CampaignCard>
        <div className={`campaign-visual ${region ? 'campaign-visual--region' : 'campaign-visual--neutral'}`}>
          {region ? <RegionArtwork region={region} alt={`Região atual: ${region}`} loading="eager" /> : <div className="campaign-visual__neutral" aria-hidden="true" />}
          <div className="campaign-visual__overlay">
            <span><Icon name="campanhas" size={22} decorative /> Registro de campanha</span>
            <h2>{data.campaign.name}</h2>
            {region ? <p>{region}</p> : <p>Região atual ainda não registrada.</p>}
          </div>
        </div>
        <div className="campaign-actions" aria-label="Ações da campanha">
          <Link className="card-action" to="/mesa"><Icon name="mesa" size={18} decorative /> Acessar mesa</Link>
          <Link className="card-action card-action--quiet" to="/personagem"><Icon name="personagens" size={18} decorative /> Ver personagens</Link>
        </div>
      </CampaignCard>

      <div className="seat-grid" aria-label="Assentos da campanha">
        {[1, 2].map((seat) => {
          const member = data.members.find((item) => item.seat === seat)
          const character = data.characters.find((item) => item.owner_id === member?.user_id)
          return <PlayerSeat key={seat} seat={seat} playerName={readPlayerName(member)} character={character} canCreate={member?.user_id === session?.user.id} />
        })}
      </div>
    </div>
  )
}
