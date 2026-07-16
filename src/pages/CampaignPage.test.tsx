// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCampaignMarkdown, copyCampaignMarkdown } from '../data/campaignContext'
import { updateCampaignContext, updateCampaignRegion } from '../data/campaigns'
import type { CampaignDashboard } from '../data/campaigns'
import type { Character } from '../types/database'
import { CampaignPage } from './CampaignPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'u1' } } }) }))
vi.mock('../hooks/useCampaignParam', () => ({ useCampaignParam: vi.fn() }))
vi.mock('../components/GptConnectionsPanel', () => ({ GptConnectionsPanel: ({ campaignId }: { campaignId: string }) => <div data-testid="gpt-connections-panel">{campaignId}</div> }))
vi.mock('../data/campaigns', async () => {
  const actual = await vi.importActual<typeof import('../data/campaigns')>('../data/campaigns')
  return { ...actual, updateCampaignContext: vi.fn(), updateCampaignRegion: vi.fn() }
})

const useCampaignParam = (await import('../hooks/useCampaignParam')).useCampaignParam as unknown as ReturnType<typeof vi.fn>
const baseCharacter: Character = {
  id: 'char-1', campaign_id: 'camp-1', owner_id: 'u1', name: 'Ayla', class_key: 'warrior', level: 2,
  presentation: 'mulher', origin: 'Fronteira', appearance: 'Cabelos curtos.', personality: 'Leal.', objective: 'Proteger.', fear: 'Falhar.',
  initial_bond: 'Juramento antigo', current_bond: 'Protege Dorian',
  attributes: { strength: 3, agility: 2, intellect: 1, presence: 1, instinct: 0 }, defense: 10, inventory_capacity: 11,
  avatar: { presentation: 'feminina', skinTone: '#b97850', hair: '#34251e', primaryColor: '#7f3f36', secondaryColor: '#4f624c', accessory: 'broche' },
  created_at: '2026-07-01', updated_at: '2026-07-01',
  character_states: { character_id: 'char-1', vitality_current: 12, vitality_max: 18, resource_current: 3, resource_max: 6, updated_at: '', updated_by: 'u1' },
  character_conditions: [{ id: 'cond-1', character_id: 'char-1', name: 'Ferido', created_by: 'u1', created_at: '' }],
  character_specialties: [{ character_id: 'char-1', name: 'Atletismo', source: 'class', created_at: '' }],
}

function dashboard(overrides: Partial<CampaignDashboard> = {}): CampaignDashboard {
  return {
    campaign: {
      id: 'camp-1', name: 'Relicario', status: 'ativa', premise: 'Duas pessoas protegem um relicario.', current_summary: 'O grupo chegou ao vale.',
      current_region_id: null, last_session_summary: 'A ultima sessao terminou diante do portao.', active_objectives: ['Encontrar a chave'],
      important_notes: 'Nao confiar no arauto.', created_at: '2026-07-01T00:00:00.000Z', created_by: 'u1', updated_at: '2026-07-01T00:00:00.000Z',
    },
    members: [
      { campaign_id: 'camp-1', user_id: 'u1', role: 'table_admin', seat: 1, joined_at: '', profile: { id: 'u1', display_name: 'Lucas', gpt_master_url: 'https://chatgpt.com/g/teste', created_at: '', updated_at: '' } },
      { campaign_id: 'camp-1', user_id: 'u2', role: 'player', seat: 2, joined_at: '', profile: { id: 'u2', display_name: 'Nina', gpt_master_url: null, created_at: '', updated_at: '' } },
    ],
    characters: [baseCharacter],
    locations: [{ id: 'loc-1', campaign_id: 'camp-1', name: 'Portao Velado', region_id: 'vale-de-ardan', kind: 'ruinas', x: 0.4, y: 0.5, revealed: true, created_at: '' }],
    currentRole: 'table_admin',
    currentProfile: { id: 'u1', display_name: 'Lucas', gpt_master_url: 'https://chatgpt.com/g/teste', created_at: '', updated_at: '' },
    ...overrides,
  }
}

function renderPage(data = dashboard()) {
  useCampaignParam.mockReturnValue({ data, loading: false, error: null, refresh: vi.fn() })
  return render(<MemoryRouter initialEntries={['/campanhas/camp-1']}><Routes><Route path="/campanhas/:campaignId" element={<CampaignPage />} /></Routes></MemoryRouter>)
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('CampaignPage', () => {
  it('compacta objetivos e permite expandir textos narrativos longos', () => {
    const longText = 'Um registro extenso da campanha. '.repeat(12)
    renderPage(dashboard({ campaign: { ...dashboard().campaign, premise: longText, last_session_summary: longText, active_objectives: ['- Um', '- Dois', '- Tres', '- Quatro', '- Cinco'] } }))
    expect(screen.getByText('+ 2 objetivos')).toBeInTheDocument()
    const premise = screen.getByRole('heading', { name: 'Premissa' }).parentElement
    expect(premise?.querySelector('.line-clamp--3')).toBeInTheDocument()
    fireEvent.click(within(premise as HTMLElement).getByRole('button', { name: 'Ver mais' }))
    expect(premise?.querySelector('.line-clamp')).not.toBeInTheDocument()
  })
  it('mostra regiao indefinida, assento preenchido e assento vazio', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Ainda nao registrada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Definir regiao atual' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ayla' })).toBeInTheDocument()
    expect(screen.getByText('Vitalidade')).toBeInTheDocument()
    expect(screen.getByText('Ferido')).toBeInTheDocument()
    expect(screen.getByText('Personagem ainda nao criado')).toBeInTheDocument()
  })

  it('seleciona e altera regiao usando apenas regioes oficiais', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Definir regiao atual' }))
    const selector = screen.getByLabelText('Selecionar regiao atual')
    expect(within(selector).getAllByRole('button')).toHaveLength(12)
    fireEvent.click(within(selector).getByRole('button', { name: /Vale de Ardan/ }))
    await waitFor(() => expect(updateCampaignRegion).toHaveBeenCalledWith('camp-1', 'vale-de-ardan'))
  })

  it('mantem participantes sem permissao em leitura', () => {
    renderPage(dashboard({ currentRole: 'player', campaign: { ...dashboard().campaign, current_region_id: 'vale-de-ardan' } }))
    expect(screen.getByRole('heading', { name: 'Vale de Ardan' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alterar regiao' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar identidade' })).not.toBeInTheDocument()
  })

  it('nao expoe nenhuma informacao tecnica de GPT na entrada principal da campanha', () => {
    renderPage(dashboard({ currentRole: 'table_admin' }))
    expect(screen.queryByTestId('gpt-connections-panel')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'GPT Mestre' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Conectar GPT Mestre' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Baixar pacote da campanha' })).not.toBeInTheDocument()
  })

  it('nao embute atalho de configuracoes na entrada principal (acesso fica na engrenagem lateral)', () => {
    renderPage(dashboard({ currentRole: 'table_admin' }))
    expect(screen.queryByRole('link', { name: /Configurações da campanha/ })).not.toBeInTheDocument()
  })

  it('nao mostra o atalho de configuracoes para jogador comum', () => {
    renderPage(dashboard({ currentRole: 'player' }))
    expect(screen.queryByRole('link', { name: /Configurações da campanha/ })).not.toBeInTheDocument()
  })

  it('salva identidade e estado narrativo com validacao simples', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Editar identidade' }))
    fireEvent.change(screen.getByLabelText('Resumo da ultima sessao'), { target: { value: 'Resumo colado do GPT.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contexto' }))
    await waitFor(() => expect(updateCampaignContext).toHaveBeenCalled())
    expect(updateCampaignContext).toHaveBeenCalledWith('camp-1', expect.objectContaining({ last_session_summary: 'Resumo colado do GPT.' }))
  })

  it('lista locais revelados com link para o mapa', () => {
    renderPage(dashboard({ campaign: { ...dashboard().campaign, current_region_id: 'vale-de-ardan' } }))
    expect(screen.getByText('Portao Velado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', '/campanhas/camp-1/mapa?region=vale-de-ardan')
  })

  it('copia o mesmo contexto Markdown e nao inclui dados privados', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const data = dashboard()
    const markdown = buildCampaignMarkdown(data)
    expect(markdown).toContain('## Protagonistas')
    expect(markdown).toContain('Portao Velado')
    expect(markdown).not.toMatch(/email|token|service-role|credential/i)
    await copyCampaignMarkdown(data)
    expect(writeText).toHaveBeenCalledWith(markdown)
  })

  it('mantem classes responsivas para desktop e celular', () => {
    const { container } = renderPage()
    expect(container.querySelector('.campaign-context-grid')).toBeInTheDocument()
    expect(container.querySelector('.seat-grid')).toBeInTheDocument()
  })
})
