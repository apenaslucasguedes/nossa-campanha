import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CampaignCard, PlayerSeat } from '../components/CampaignCard'
import { Icon } from '../components/Icon'
import { RegionArtwork } from '../components/RegionArtwork'
import { readPlayerName } from '../components/playerName'
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { updateCampaignContext, updateCampaignRegion, type CampaignContextInput } from '../data/campaigns'
import { rememberLastCampaign } from '../data/lastCampaign'
import { regionIds, regions, type RegionId } from '../game-data/regions'
import { useCampaignParam } from '../hooks/useCampaignParam'
import type { Campaign, CampaignLocation } from '../types/database'

const limits = { name: 120, status: 40, premise: 1200, current_summary: 2400, last_session_summary: 3200, important_notes: 3200 }

function campaignForm(campaign: Campaign): CampaignContextInput {
  return {
    name: campaign.name,
    status: campaign.status,
    premise: campaign.premise,
    current_summary: campaign.current_summary,
    current_region_id: campaign.current_region_id,
    last_session_summary: campaign.last_session_summary,
    active_objectives: campaign.active_objectives,
    important_notes: campaign.important_notes,
  }
}

function shortDescription(value: string) {
  return value.length > 230 ? `${value.slice(0, 227).trim()}...` : value
}

function fieldError(form: CampaignContextInput) {
  if (!form.name.trim()) return 'Informe o nome da campanha.'
  if (!form.status.trim()) return 'Informe o status da campanha.'
  if (form.name.length > limits.name) return 'O nome deve ter ate 120 caracteres.'
  if (form.status.length > limits.status) return 'O status deve ter ate 40 caracteres.'
  if (form.premise.length > limits.premise) return 'A premissa deve ter ate 1200 caracteres.'
  if (form.current_summary.length > limits.current_summary) return 'O resumo atual deve ter ate 2400 caracteres.'
  if (form.last_session_summary.length > limits.last_session_summary) return 'O resumo da ultima sessao deve ter ate 3200 caracteres.'
  if (form.important_notes.length > limits.important_notes) return 'As anotacoes devem ter ate 3200 caracteres.'
  if (form.active_objectives.length > 8) return 'Use no maximo oito objetivos ativos.'
  return null
}

export function CampaignPage() {
  const location = useLocation()
  const navigationNotice = location.state as { notice?: string; warning?: string } | null
  const { session } = useAuth()
  const { campaignId } = useParams()
  const { data, loading, error, refresh } = useCampaignParam(campaignId, session?.user.id)
  useEffect(() => { if (session?.user.id && campaignId) rememberLastCampaign(session.user.id, campaignId) }, [session?.user.id, campaignId])
  const [editing, setEditing] = useState(false)
  const [selectingRegion, setSelectingRegion] = useState(false)
  const [form, setForm] = useState<CampaignContextInput | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (data?.campaign) setForm(campaignForm(data.campaign)) }, [data?.campaign])

  if (loading) return <LoadingState />

  if (!data || !form) {
    return (
      <>
        <PageHeader eyebrow="Painel compartilhado" title="Campanha">Os dois assentos e o estado mecanico atual da mesa.</PageHeader>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <EmptyState title="Nenhuma campanha vinculada" icon="campanhas">Peca ao administrador para concluir o bootstrap dos dois usuarios.</EmptyState>
      </>
    )
  }

  const dashboard = data
  const currentForm = form
  const canEdit = data.currentRole === 'table_admin'
  const region = data.campaign.current_region_id ? regions[data.campaign.current_region_id] : null
  const revealedLocations = data.locations.filter((location) => location.revealed)
  const validation = fieldError(currentForm)

  async function saveContext() {
    if (validation) return
    setBusy(true); setMessage(null)
    try {
      await updateCampaignContext(dashboard.campaign.id, { ...currentForm, name: currentForm.name.trim(), status: currentForm.status.trim(), active_objectives: currentForm.active_objectives.map((item) => item.trim()).filter(Boolean) })
      await refresh(); setEditing(false); setMessage('Contexto da campanha salvo.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function saveRegion(regionId: RegionId) {
    setBusy(true); setMessage(null)
    try {
      await updateCampaignRegion(dashboard.campaign.id, regionId)
      await refresh(); setSelectingRegion(false); setMessage('Regiao atual salva.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel salvar a regiao.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="campaign-page">
      <PageHeader eyebrow="Painel de contexto" title={data.campaign.name}>Registro vivo da campanha, protagonistas, regiao atual e continuidade da mesa.</PageHeader>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {navigationNotice?.notice ? <div className="action-toast" role="status">{navigationNotice.notice}</div> : null}
      {navigationNotice?.warning ? <div className="permission-note" role="note">{navigationNotice.warning}</div> : null}
      {message ? <div className="action-toast" role="status">{message}</div> : null}

      <section className="campaign-context-grid" aria-label="Contexto da campanha">
        <CampaignCard>
          <div className={`campaign-visual ${region ? 'campaign-visual--region' : 'campaign-visual--neutral'}`}>
            {region ? <RegionArtwork region={region.assetKey} alt={`Regiao atual: ${region.name}`} loading="eager" /> : <div className="campaign-visual__neutral" aria-hidden="true" />}
            <div className="campaign-visual__overlay">
              <span><Icon name="mapa" size={22} decorative /> Regiao atual</span>
              <h2>{region?.name ?? 'Ainda nao registrada'}</h2>
              <p>{region ? shortDescription(region.description) : 'Defina a regiao principal da campanha para orientar a leitura do mapa e o pacote de contexto.'}</p>
              <div className="campaign-inline-actions">
                {region ? <Link className="card-action" to={`/campanhas/${campaignId}/mapa?region=${data.campaign.current_region_id}`}>Ver no mapa</Link> : null}
                {canEdit ? <button className="card-action card-action--quiet" type="button" onClick={() => setSelectingRegion((value) => !value)}>{region ? 'Alterar regiao' : 'Definir regiao atual'}</button> : null}
              </div>
            </div>
          </div>
          {selectingRegion && canEdit ? <RegionSelector current={data.campaign.current_region_id} disabled={busy} onSelect={saveRegion} /> : null}
        </CampaignCard>

        <section className="campaign-panel" aria-labelledby="campaign-identity-title">
          <div className="section-heading">
            <Icon name="campanhas" size={24} decorative />
            <div><h2 id="campaign-identity-title">Identidade da campanha</h2><p>{canEdit ? 'Edicao simples para o administrador da mesa.' : 'Modo leitura para participantes.'}</p></div>
          </div>
              {editing && canEdit ? (
            <CampaignIdentityForm form={currentForm} setForm={setForm} validation={validation} busy={busy} onSave={saveContext} onCancel={() => { setForm(campaignForm(data.campaign)); setEditing(false) }} />
          ) : (
            <CampaignIdentityRead campaign={data.campaign} regionName={region?.name} canEdit={canEdit} onEdit={() => setEditing(true)} />
          )}
        </section>
      </section>

      <section className="campaign-panel" aria-labelledby="campaign-state-title">
        <div className="section-heading">
          <Icon name="campanhas" size={24} decorative />
          <div><h2 id="campaign-state-title">Estado da campanha</h2><p>Resumo colado pelos jogadores para orientar continuidade narrativa.</p></div>
        </div>
        <CampaignNarrativeRead campaign={data.campaign} locations={revealedLocations} campaignId={campaignId!} />
      </section>

      <div className="seat-grid" aria-label="Assentos da campanha">
        {[1, 2].map((seat) => {
          const member = data.members.find((item) => item.seat === seat)
          const character = data.characters.find((item) => item.owner_id === member?.user_id)
          return <PlayerSeat key={seat} seat={seat} playerName={readPlayerName(member)} character={character} canCreate={member?.user_id === session?.user.id} campaignId={campaignId!} />
        })}
      </div>
    </div>
  )
}

function RegionSelector({ current, disabled, onSelect }: { current: RegionId | null; disabled: boolean; onSelect: (regionId: RegionId) => void }) {
  return <div className="region-selector" aria-label="Selecionar regiao atual">{regionIds.map((id) => <button key={id} type="button" disabled={disabled || current === id} onClick={() => onSelect(id)}><span>{regions[id].name}</span><small>{shortDescription(regions[id].description)}</small></button>)}</div>
}

function CampaignIdentityRead({ campaign, regionName, canEdit, onEdit }: { campaign: Campaign; regionName?: string; canEdit: boolean; onEdit: () => void }) {
  return <div className="campaign-readout"><dl><div><dt>Nome</dt><dd>{campaign.name}</dd></div><div><dt>Status</dt><dd>{campaign.status || 'Nao registrado'}</dd></div><div><dt>Regiao atual</dt><dd>{regionName ?? 'Nao definida'}</dd></div><div><dt>Criada em</dt><dd>{campaign.created_at ? new Date(campaign.created_at).toLocaleDateString('pt-BR') : 'Nao disponivel'}</dd></div></dl><TextBlock title="Premissa" value={campaign.premise} /><TextBlock title="Resumo atual" value={campaign.current_summary} />{canEdit ? <button className="card-action" type="button" onClick={onEdit}>Editar identidade</button> : null}</div>
}

function CampaignNarrativeRead({ campaign, locations, campaignId }: { campaign: Campaign; locations: CampaignLocation[]; campaignId: string }) {
  const visibleObjectives = campaign.active_objectives.slice(0, 3)
  const remaining = campaign.active_objectives.length - visibleObjectives.length
  return <div className="campaign-readout campaign-readout--narrative"><TextBlock title="Resumo da ultima sessao" value={campaign.last_session_summary} lines={4} /><div><h3>Objetivos ativos</h3>{visibleObjectives.length ? <><ul>{visibleObjectives.map((objective) => <li key={objective}>{objective.replace(/^\s*[-•]\s*/, '')}</li>)}</ul>{remaining > 0 ? <p className="campaign-overflow-count">+ {remaining} objetivos</p> : null}</> : <p>Nenhum objetivo registrado.</p>}</div><TextBlock title="Anotacoes importantes" value={campaign.important_notes} lines={4} /><details className="campaign-locations-readout"><summary>Locais revelados <span>{locations.length || '—'}</span></summary>{locations.length ? <ul className="revealed-location-list revealed-location-list--compact">{locations.map((location) => <li key={location.id}><div><strong>{location.name}</strong><span>{regions[location.region_id].name}{location.kind ? ` - ${location.kind}` : ''}</span></div><Link className="card-action card-action--quiet" to={`/campanhas/${campaignId}/mapa?region=${location.region_id}`}>Mapa</Link></li>)}</ul> : <p>Nenhum local revelado nesta campanha.</p>}</details></div>
}

function TextBlock({ title, value, lines = 3 }: { title: string; value: string; lines?: number }) {
  const text = value.trim() || 'Nao registrado.'
  const [expanded, setExpanded] = useState(false)
  const canExpand = text.length > (lines === 4 ? 220 : 150)
  return <div className="campaign-text-block"><h3>{title}</h3><p className={expanded ? '' : `line-clamp line-clamp--${lines}`}>{text}</p>{canExpand ? <button type="button" className="campaign-text-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Ver menos' : 'Ver mais'}</button> : null}</div>
}

function CampaignIdentityForm({ form, setForm, validation, busy, onSave, onCancel }: { form: CampaignContextInput; setForm: (form: CampaignContextInput) => void; validation: string | null; busy: boolean; onSave: () => void; onCancel: () => void }) {
  const objectiveText = useMemo(() => form.active_objectives.join('\n'), [form.active_objectives])
  return <form className="campaign-form" onSubmit={(event) => { event.preventDefault(); onSave() }}>
    <label>Nome da campanha<input maxLength={limits.name} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
    <label>Status<input maxLength={limits.status} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} /></label>
    <label>Premissa<textarea maxLength={limits.premise} value={form.premise} onChange={(event) => setForm({ ...form, premise: event.target.value })} /></label>
    <label>Resumo atual<textarea maxLength={limits.current_summary} value={form.current_summary} onChange={(event) => setForm({ ...form, current_summary: event.target.value })} /></label>
    <label>Resumo da ultima sessao<textarea maxLength={limits.last_session_summary} value={form.last_session_summary} onChange={(event) => setForm({ ...form, last_session_summary: event.target.value })} /></label>
    <label>Objetivos ativos<textarea value={objectiveText} onChange={(event) => setForm({ ...form, active_objectives: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 8) })} /></label>
    <label>Anotacoes importantes<textarea maxLength={limits.important_notes} value={form.important_notes} onChange={(event) => setForm({ ...form, important_notes: event.target.value })} /></label>
    {validation ? <p className="form-error">{validation}</p> : <p className="form-note">Campos simples, persistidos na campanha e reutilizados no pacote Markdown.</p>}
    <div className="campaign-inline-actions"><button className="card-action" type="submit" disabled={busy || Boolean(validation)}>Salvar contexto</button><button className="card-action card-action--quiet" type="button" onClick={onCancel}>Cancelar</button></div>
  </form>
}
