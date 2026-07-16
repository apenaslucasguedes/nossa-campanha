import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { GptConnectionsPanel } from '../components/GptConnectionsPanel'
import { Icon } from '../components/Icon'
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { copyCampaignMarkdown, downloadCampaignMarkdown } from '../data/campaignContext'
import { regions } from '../game-data/regions'
import { useCampaignParam } from '../hooks/useCampaignParam'

export function CampaignSettingsPage() {
  const { session } = useAuth()
  const { campaignId } = useParams()
  const { data, loading, error } = useCampaignParam(campaignId, session?.user.id)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  if (loading) return <LoadingState />
  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Configurações" title="Campanha">Contexto e conexões técnicas da campanha.</PageHeader>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <EmptyState title="Nenhuma campanha vinculada" icon="campanhas">Volte à campanha e tente novamente.</EmptyState>
      </>
    )
  }

  const canEdit = data.currentRole === 'table_admin'
  const region = data.campaign.current_region_id ? regions[data.campaign.current_region_id] : null
  const gptUrl = data.currentProfile?.gpt_master_url ?? null

  async function copyContext() {
    setCopyState('idle')
    try { await copyCampaignMarkdown(data!); setCopyState('copied') } catch { setCopyState('error') }
  }

  return (
    <div className="campaign-settings-page">
      <PageHeader eyebrow="Configurações da campanha" title={data.campaign.name}>Contexto, conexão com o GPT Mestre e endereços técnicos. Fora da entrada principal da campanha.</PageHeader>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <p className="campaign-inline-actions"><Link className="card-action card-action--quiet" to={`/campanhas/${campaignId}`}>← Voltar à campanha</Link></p>

      <section className="campaign-panel" aria-labelledby="settings-context-title">
        <div className="section-heading">
          <Icon name="campanhas" size={24} decorative />
          <div><h2 id="settings-context-title">Identidade e contexto</h2><p>Resumo da campanha vinculada a estas configurações.</p></div>
        </div>
        <div className="campaign-readout">
          <dl>
            <div><dt>Nome</dt><dd>{data.campaign.name}</dd></div>
            <div><dt>Status</dt><dd>{data.campaign.status || 'Não registrado'}</dd></div>
            <div><dt>Região atual</dt><dd>{region?.name ?? 'Não definida'}</dd></div>
          </dl>
        </div>
      </section>

      <section className="campaign-panel campaign-gpt-panel" aria-labelledby="settings-gpt-title">
        <div className="section-heading">
          <Icon name="compendio" size={24} decorative />
          <div><h2 id="settings-gpt-title">GPT Mestre</h2><p>Exportação manual do contexto e atalho para o GPT.</p></div>
        </div>
        <div className="campaign-inline-actions">
          <button className="card-action" type="button" onClick={() => downloadCampaignMarkdown(data)}>Baixar pacote da campanha</button>
          <button className="card-action card-action--quiet" type="button" onClick={() => void copyContext()}>Copiar contexto</button>
          {gptUrl ? <a className="card-action card-action--quiet" href={gptUrl} target="_blank" rel="noreferrer">Abrir GPT Mestre</a> : <Link className="card-action card-action--quiet" to="/configuracoes">Configurar URL</Link>}
        </div>
        {copyState === 'copied' ? <p className="form-note">Contexto copiado.</p> : null}
        {copyState === 'error' ? <p className="form-error">Não foi possível copiar neste navegador.</p> : null}
      </section>

      {canEdit ? <GptConnectionsPanel campaignId={data.campaign.id} /> : (
        <p className="permission-note">A conexão do GPT Mestre e os endereços técnicos ficam disponíveis para o administrador da mesa.</p>
      )}
    </div>
  )
}
