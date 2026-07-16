import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { GptConnectionsPanel } from '../components/GptConnectionsPanel'
import { Icon } from '../components/Icon'
import { EmptyState, ErrorBanner, LoadingState } from '../components/States'
import { copyCampaignMarkdown, downloadCampaignMarkdown } from '../data/campaignContext'
import { regions } from '../game-data/regions'
import { useCampaignParam } from '../hooks/useCampaignParam'

export function CampaignSettingsPage() {
  const { session } = useAuth()
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const { data, loading, error } = useCampaignParam(campaignId, session?.user.id)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const drawerRef = useRef<HTMLDivElement>(null)

  const closeTo = campaignId ? `/campanhas/${campaignId}` : '/campanhas'
  function close() { navigate(closeTo) }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const drawer = drawerRef.current
    drawer?.querySelector<HTMLElement>('button, a, input, select, textarea')?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); navigate(closeTo); return }
      if (event.key !== 'Tab' || !drawer) return
      const focusable = [...drawer.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary')]
      if (!focusable.length) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [closeTo, navigate])

  if (loading) return <LoadingState />
  if (!data) {
    return (
      <div className="settings-overlay">
        <div ref={drawerRef} className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-drawer-title">
          <header className="settings-drawer__header">
            <div>
              <span className="settings-drawer__eyebrow"><Icon name="configuracoes" size={16} decorative /> Configurações</span>
              <h1 id="settings-drawer-title">Campanha</h1>
            </div>
            <button className="settings-drawer__close" type="button" onClick={close} aria-label="Fechar configurações">Fechar</button>
          </header>
          {error ? <ErrorBanner>{error}</ErrorBanner> : null}
          <EmptyState title="Nenhuma campanha vinculada" icon="campanhas">Volte à campanha e tente novamente.</EmptyState>
        </div>
      </div>
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
    <div className="settings-overlay">
      <div ref={drawerRef} className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-drawer-title">
        <header className="settings-drawer__header">
          <div>
            <span className="settings-drawer__eyebrow"><Icon name="configuracoes" size={16} decorative /> Configurações da campanha</span>
            <h1 id="settings-drawer-title">{data.campaign.name}</h1>
          </div>
          <button className="settings-drawer__close" type="button" onClick={close} aria-label="Fechar configurações e voltar à campanha">Fechar</button>
        </header>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <section className="settings-section" aria-labelledby="settings-context-title">
          <h2 id="settings-context-title" className="settings-section__title">Identidade e contexto</h2>
          <div className="campaign-readout">
            <dl>
              <div><dt>Nome</dt><dd>{data.campaign.name}</dd></div>
              <div><dt>Status</dt><dd>{data.campaign.status || 'Não registrado'}</dd></div>
              <div><dt>Região atual</dt><dd>{region?.name ?? 'Não definida'}</dd></div>
            </dl>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-export-title">
          <h2 id="settings-export-title" className="settings-section__title">Exportação</h2>
          <div className="campaign-inline-actions">
            <button className="card-action" type="button" onClick={() => downloadCampaignMarkdown(data)}>Baixar pacote da campanha</button>
            <button className="card-action card-action--quiet" type="button" onClick={() => void copyContext()}>Copiar contexto</button>
            {gptUrl ? <a className="card-action card-action--quiet settings-gpt-link" href={gptUrl} target="_blank" rel="noreferrer">Abrir GPT Mestre</a> : <Link className="card-action card-action--quiet settings-gpt-link" to="/configuracoes">Configurar URL</Link>}
          </div>
          {copyState === 'copied' ? <p className="form-note">Contexto copiado.</p> : null}
          {copyState === 'error' ? <p className="form-error">Não foi possível copiar neste navegador.</p> : null}
        </section>

        {canEdit ? <GptConnectionsPanel campaignId={data.campaign.id} /> : (
          <p className="permission-note">A conexão do GPT Mestre e os endereços técnicos ficam disponíveis para o administrador da mesa.</p>
        )}
      </div>
    </div>
  )
}
