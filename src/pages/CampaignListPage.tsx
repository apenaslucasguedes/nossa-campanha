import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { MechanicalButton, RelicarioPanel, SectionTitle } from '../components/RelicarioUI'
import { archiveCampaign, createCampaign, listMyCampaigns, subscribeToMyCampaignMemberships, type CampaignSummary } from '../data/campaignsList'
import { rememberLastCampaign } from '../data/lastCampaign'
import { supabase } from '../lib/supabase'
import { regionIds, regions } from '../game-data/regions'
import type { RegionId } from '../types/database'

export function CampaignListPage() {
  const { session } = useAuth()
  const userId = session?.user.id
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) return
    try { setError(null); setCampaigns(await listMyCampaigns(userId)) } catch { setError('Não foi possível carregar suas campanhas.') } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (!userId) return
    const channel = subscribeToMyCampaignMemberships(userId, () => void refresh())
    return () => { void supabase.removeChannel(channel) }
  }, [userId, refresh])

  function open(campaignId: string) {
    if (userId) rememberLastCampaign(userId, campaignId)
    navigate(`/campanhas/${campaignId}`)
  }

  async function archive(campaignId: string) {
    if (!window.confirm('Arquivar esta campanha? Ela deixará de aparecer como ativa, mas os dados são preservados.')) return
    try { await archiveCampaign(campaignId); await refresh() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível arquivar.') }
  }

  if (loading) return <LoadingState />

  const active = campaigns.filter((item) => item.campaign.status !== 'arquivada')
  const archived = campaigns.filter((item) => item.campaign.status === 'arquivada')

  return (
    <div className="campaign-list-page">
      <PageHeader eyebrow="Suas campanhas" title="Campanhas">Cada campanha mantém personagens, sessões, histórico e mapa completamente isolados.</PageHeader>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      {active.length ? (
        <div className="campaign-list-grid">
          {active.map((item) => (
            <RelicarioPanel key={item.campaign.id} className="campaign-list-card" labelledBy={`campaign-${item.campaign.id}`}>
              <SectionTitle icon="campanhas" title={item.campaign.name} id={`campaign-${item.campaign.id}`} description={item.campaign.status || 'ativa'} />
              <dl className="campaign-list-card__meta">
                <div><dt>Região atual</dt><dd>{item.campaign.current_region_id ? regions[item.campaign.current_region_id].name : 'Não definida'}</dd></div>
                <div><dt>Assentos</dt><dd>{item.members.length}/2</dd></div>
                <div><dt>Personagens</dt><dd>{item.characters.length ? item.characters.map((character) => character.name).join(', ') : 'Nenhum'}</dd></div>
                <div><dt>Sessão atual</dt><dd>{item.activeSession ? `Sessão ${item.activeSession.number}` : 'Nenhuma sessão ativa'}</dd></div>
              </dl>
              <div className="campaign-list-card__actions">
                <MechanicalButton tone="primary" onClick={() => open(item.campaign.id)}>Abrir</MechanicalButton>
                <MechanicalButton tone="danger" onClick={() => void archive(item.campaign.id)}>Arquivar</MechanicalButton>
              </div>
            </RelicarioPanel>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma campanha ainda" icon="campanhas">Crie sua primeira campanha para começar a jogar.</EmptyState>
      )}

      <RelicarioPanel className="campaign-create-panel" labelledBy="campaign-create-title">
        <SectionTitle icon="campanhas" title="Nova campanha" id="campaign-create-title" description="Cria a campanha, seu assento e a primeira sessão automaticamente." />
        <CreateCampaignForm creating={creating} onCreate={async (input) => {
          setCreating(true)
          try { const campaign = await createCampaign(input); if (userId) rememberLastCampaign(userId, campaign.id); navigate(`/campanhas/${campaign.id}`) }
          catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar a campanha.') }
          finally { setCreating(false) }
        }} />
      </RelicarioPanel>

      {archived.length ? (
        <RelicarioPanel className="campaign-archived-panel" labelledBy="campaign-archived-title">
          <SectionTitle icon="campanhas" title="Campanhas arquivadas" id="campaign-archived-title" />
          <ul className="campaign-archived-list">
            {archived.map((item) => (
              <li key={item.campaign.id}><span>{item.campaign.name}</span><MechanicalButton onClick={() => open(item.campaign.id)}>Abrir</MechanicalButton></li>
            ))}
          </ul>
        </RelicarioPanel>
      ) : null}
    </div>
  )
}

function CreateCampaignForm({ creating, onCreate }: { creating: boolean; onCreate: (input: { name: string; premise?: string; region_id?: RegionId | null }) => Promise<void> }) {
  const [name, setName] = useState('')
  const [premise, setPremise] = useState('')
  const [regionId, setRegionId] = useState<RegionId | ''>('')

  return (
    <form className="campaign-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) void onCreate({ name: name.trim(), premise: premise.trim(), region_id: regionId || null }) }}>
      <label>Nome da campanha<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Premissa (opcional)<textarea maxLength={1200} value={premise} onChange={(event) => setPremise(event.target.value)} /></label>
      <label>Região inicial (opcional)
        <select value={regionId} onChange={(event) => setRegionId(event.target.value as RegionId | '')}>
          <option value="">Não definida</option>
          {regionIds.map((id) => <option key={id} value={id}>{regions[id].name}</option>)}
        </select>
      </label>
      <MechanicalButton tone="primary" type="submit" disabled={creating || !name.trim()}>{creating ? 'Criando…' : 'Criar campanha'}</MechanicalButton>
    </form>
  )
}
