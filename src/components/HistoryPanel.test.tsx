// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CampaignEvent } from '../types/database'
import { HistoryPanel } from './HistoryPanel'

const loadEventsPage = vi.fn()
vi.mock('../data/events', () => ({
  loadEventsPage: (...a: unknown[]) => loadEventsPage(...a),
  getEventPrefs: () => Promise.resolve(0),
  subscribeToEvents: () => ({ topic: 'x' }),
  archiveEvent: vi.fn(),
  setHiddenBefore: vi.fn(), resetHiddenBefore: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { removeChannel: vi.fn() } }))

function event(overrides: Partial<CampaignEvent> = {}): CampaignEvent {
  return {
    id: 'e1', sequence: 5, campaign_id: 'camp-1', session_id: 's1', source: 'player', user_id: 'u1', character_id: 'char-1',
    event_type: 'dice_roll', summary: 'Aldra lançou 1d20 e obteve 17.', payload: {}, payload_version: 1,
    is_test: false, is_archived: false, created_at: '2026-07-16T12:00:00.000Z', ...overrides,
  }
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('HistoryPanel', () => {
  it('mostra um resumo útil do teste com resultado, usando o payload existente', async () => {
    loadEventsPage.mockResolvedValue([event({
      payload: { character_name: 'Aldra', attribute: 'intellect', specialty: 'Investigação', difficulty: 14, reason: 'Examinar os símbolos às margens do riacho', total: 17, test_label: 'Intelecto + Investigação' },
    })])
    render(<HistoryPanel campaignId="camp-1" sessionId="s1" userId="u1" isAdmin={false} />)
    expect(await screen.findByText('Aldra — Intelecto + Investigação, dificuldade 14')).toBeInTheDocument()
    expect(screen.getByText('Examinar os símbolos às margens do riacho')).toBeInTheDocument()
    expect(screen.getByText('Resultado: 17')).toBeInTheDocument()
  })

  it('mantém filtros e arquivamento em uma seção recolhível', async () => {
    loadEventsPage.mockResolvedValue([event()])
    const { container } = render(<HistoryPanel campaignId="camp-1" sessionId="s1" userId="u1" isAdmin={false} />)
    await screen.findByText('Aldra lançou 1d20 e obteve 17.')
    const details = container.querySelector('details.history-filters-wrap')
    expect(details).toBeInTheDocument()
    expect(details).not.toHaveAttribute('open')
    expect(screen.getByText('Filtros e arquivamento')).toBeInTheDocument()
  })
})
