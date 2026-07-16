import { useCallback, useEffect, useMemo, useState } from 'react'
import { archiveEvent, getEventPrefs, loadEventsPage, resetHiddenBefore, setHiddenBefore, subscribeToEvents, type EventFilter } from '../data/events'
import { supabase } from '../lib/supabase'
import type { CampaignEvent } from '../types/database'
import { MechanicalButton, SectionTitle } from './RelicarioUI'

type ScopeFilter = 'session' | 'all'
type TypeFilter = 'all' | 'rolls' | 'combat' | 'system'

const TYPE_GROUPS: Record<Exclude<TypeFilter, 'all'>, string[]> = {
  rolls: ['dice_roll', 'roll_requested'],
  combat: ['combat_started', 'combat_ended', 'enemy_created', 'enemy_changed', 'character_fallen', 'character_stable', 'turn_advanced', 'turn_selected', 'initiative_reordered', 'enemy_attack', 'enemy_attack_miss', 'condition_added'],
  system: ['session_started', 'campaign_created'],
}

const EVENT_ICONS: Record<string, string> = { dice_roll: '🎲', roll_requested: '⏳', combat_started: '⚔️', combat_ended: '🏳️', session_started: '📖' }

const ATTRIBUTE_LABELS: Record<string, string> = { strength: 'Força', agility: 'Agilidade', intellect: 'Intelecto', presence: 'Presença', instinct: 'Instinto' }

function eventIcon(type: string) { return EVENT_ICONS[type] ?? '•' }

function str(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function num(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key]
  return typeof value === 'number' ? value : null
}

/**
 * Resumo útil do evento a partir de dados que já existem no payload
 * (personagem, teste, dificuldade, motivo, resultado). Cai para o summary
 * gravado quando o evento é antigo ou não é uma rolagem.
 */
function eventLines(event: CampaignEvent): { headline: string; detail: string | null; result: string | null } {
  const payload = event.payload ?? {}
  if (event.event_type === 'dice_roll' || event.event_type === 'roll_requested') {
    const name = str(payload, 'character_name')
    const attribute = str(payload, 'attribute')
    const specialty = str(payload, 'specialty')
    const test = str(payload, 'test_label') ?? [attribute ? (ATTRIBUTE_LABELS[attribute] ?? attribute) : null, specialty].filter(Boolean).join(' + ')
    const difficulty = num(payload, 'difficulty')
    if (name && (test || difficulty != null)) {
      const headline = `${name}${test ? ` — ${test}` : ''}${difficulty != null ? `, dificuldade ${difficulty}` : ''}`
      const reason = str(payload, 'reason')
      const total = event.event_type === 'dice_roll' ? num(payload, 'total') : null
      return { headline, detail: reason, result: total != null ? `Resultado: ${total}` : null }
    }
  }
  return { headline: event.summary, detail: null, result: null }
}

export function HistoryPanel({ campaignId, sessionId, userId, isAdmin }: { campaignId: string; sessionId: string | null; userId: string; isAdmin: boolean }) {
  const [events, setEvents] = useState<CampaignEvent[]>([])
  const [scope, setScope] = useState<ScopeFilter>('session')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [hideTests, setHideTests] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [hiddenBefore, setHiddenBefore_] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const filter: EventFilter = useMemo(() => ({
    sessionId: scope === 'session' ? sessionId : undefined,
    includeTests: !hideTests,
    includeArchived: showArchived,
    onlyTypes: typeFilter === 'all' ? undefined : TYPE_GROUPS[typeFilter],
  }), [scope, sessionId, hideTests, showArchived, typeFilter])

  const load = useCallback(async () => {
    const page = await loadEventsPage(campaignId, filter)
    setEvents(page)
    setHasMore(page.length > 0)
  }, [campaignId, filter])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void getEventPrefs(campaignId, userId).then(setHiddenBefore_) }, [campaignId, userId])

  useEffect(() => {
    const channel = subscribeToEvents(campaignId, (event) => {
      setEvents((current) => {
        if (current.some((item) => item.id === event.id)) return current
        if (filter.sessionId && event.session_id !== filter.sessionId) return current
        if (!filter.includeTests && event.is_test) return current
        return [event, ...current]
      })
    })
    return () => { void supabase.removeChannel(channel) }
  }, [campaignId, filter.sessionId, filter.includeTests])

  async function loadMore() {
    if (!events.length) return
    setLoadingMore(true)
    try {
      const page = await loadEventsPage(campaignId, filter, events[events.length - 1].sequence)
      setEvents((current) => [...current, ...page])
      setHasMore(page.length > 0)
    } finally { setLoadingMore(false) }
  }

  const visibleEvents = events.filter((event) => event.sequence > hiddenBefore)

  return (
    <section className="history-panel" aria-label="Histórico da Mesa">
      <SectionTitle icon="diario" title="Histórico" description="Rolagens, combate e eventos da campanha, sincronizados em tempo real." />
      <details className="history-filters-wrap">
        <summary>Filtros e arquivamento</summary>
      <div className="history-filters" role="group" aria-label="Filtros do histórico">
        <select value={scope} onChange={(event) => setScope(event.target.value as ScopeFilter)} aria-label="Escopo">
          <option value="session">Sessão atual</option>
          <option value="all">Todas as sessões</option>
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} aria-label="Tipo">
          <option value="all">Todos os tipos</option>
          <option value="rolls">Só rolagens</option>
          <option value="combat">Combate</option>
          <option value="system">Sistema</option>
        </select>
        <label><input type="checkbox" checked={hideTests} onChange={(event) => setHideTests(event.target.checked)} /> Ocultar testes</label>
        {isAdmin ? <label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Mostrar arquivados</label> : null}
        {hiddenBefore > 0
          ? <MechanicalButton onClick={() => void resetHiddenBefore(campaignId, userId).then(() => setHiddenBefore_(0))}>Mostrar tudo novamente</MechanicalButton>
          : <MechanicalButton onClick={() => { const latest = events[0]?.sequence ?? 0; void setHiddenBefore(campaignId, userId, latest).then(() => setHiddenBefore_(latest)) }}>Limpar visualização</MechanicalButton>}
      </div>
      </details>
      {visibleEvents.length ? (
        <ol className="history-list">
          {visibleEvents.map((event) => {
            const lines = eventLines(event)
            return (
            <li key={event.id} className={event.is_test ? 'history-item history-item--test' : 'history-item'}>
              <span className="history-item__icon" aria-hidden="true">{eventIcon(event.event_type)}</span>
              <div className="history-item__body">
                <p className="history-item__headline">{lines.headline}{event.is_test ? <span className="history-item__badge"> teste</span> : null}</p>
                {lines.detail ? <p className="history-item__detail">{lines.detail}</p> : null}
                {lines.result ? <p className="history-item__result">{lines.result}</p> : null}
                <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('pt-BR')}</time>
              </div>
              {isAdmin && !event.is_archived ? <MechanicalButton onClick={() => void archiveEvent(event.id).then(load)}>Arquivar</MechanicalButton> : null}
            </li>
            )
          })}
        </ol>
      ) : <p className="compact-empty">Nenhum evento registrado ainda.</p>}
      {hasMore && events.length >= 30 ? <MechanicalButton onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Carregando…' : 'Carregar mais'}</MechanicalButton> : null}
    </section>
  )
}
