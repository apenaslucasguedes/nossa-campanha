// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CampaignDashboard } from '../data/campaigns'
import { CampaignSettingsPage } from './CampaignSettingsPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'u1' } } }) }))
vi.mock('../hooks/useCampaignParam', () => ({ useCampaignParam: vi.fn() }))
vi.mock('../components/GptConnectionsPanel', () => ({ GptConnectionsPanel: ({ campaignId }: { campaignId: string }) => <div data-testid="gpt-connections-panel">{campaignId}</div> }))
vi.mock('../data/campaignPreparation', () => ({ prepareCleanCampaignCopy: vi.fn() }))
vi.mock('../data/lastCampaign', () => ({ rememberLastCampaign: vi.fn() }))

const useCampaignParam = (await import('../hooks/useCampaignParam')).useCampaignParam as unknown as ReturnType<typeof vi.fn>
const prepareCleanCampaignCopy = (await import('../data/campaignPreparation')).prepareCleanCampaignCopy as unknown as ReturnType<typeof vi.fn>

function dashboard(role: CampaignDashboard['currentRole']): CampaignDashboard {
  return {
    campaign: { id: 'camp-1', name: 'Relicario', status: 'ativa', premise: '', current_summary: '', current_region_id: null, last_session_summary: '', active_objectives: [], important_notes: '', created_at: '', created_by: 'u1', updated_at: '' },
    members: [], characters: [], locations: [], currentRole: role,
    currentProfile: { id: 'u1', display_name: 'Lucas', gpt_master_url: 'https://chatgpt.com/g/teste', created_at: '', updated_at: '' },
  }
}

function renderPage(role: CampaignDashboard['currentRole']) {
  useCampaignParam.mockReturnValue({ data: dashboard(role), loading: false, error: null, refresh: vi.fn() })
  return render(<MemoryRouter initialEntries={['/campanhas/camp-1/configuracoes']}><Routes><Route path="/campanhas/:campaignId/configuracoes" element={<CampaignSettingsPage />} /></Routes></MemoryRouter>)
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('CampaignSettingsPage', () => {
  it('reúne exportação, conexão do GPT e URLs técnicas para o administrador', () => {
    renderPage('table_admin')
    expect(screen.getByRole('button', { name: 'Baixar pacote da campanha' })).toBeInTheDocument()
    expect(screen.getByTestId('gpt-connections-panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fechar configurações/ })).toBeInTheDocument()
  })

  it('esconde a conexão técnica do GPT para jogador comum', () => {
    renderPage('player')
    expect(screen.queryByTestId('gpt-connections-panel')).not.toBeInTheDocument()
  })

  it('explica a cópia limpa antes de executar e não mostra a ação a jogador comum', () => {
    renderPage('table_admin')
    fireEvent.click(screen.getByRole('button', { name: 'Preparar campanha para jogar' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('A campanha atual será preservada como campanha de testes')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Chaves GPT')
    expect(prepareCleanCampaignCopy).not.toHaveBeenCalled()
    cleanup()
    renderPage('player')
    expect(screen.queryByRole('button', { name: 'Preparar campanha para jogar' })).not.toBeInTheDocument()
  })

  it('atualiza o seletor e navega para a nova campanha depois do sucesso', async () => {
    prepareCleanCampaignCopy.mockResolvedValue({ archived_campaign_id: 'camp-1', new_campaign_id: 'camp-2', character_map: {} })
    renderPage('table_admin')
    fireEvent.click(screen.getByRole('button', { name: 'Preparar campanha para jogar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar campanha limpa' }))
    await waitFor(() => expect(prepareCleanCampaignCopy).toHaveBeenCalledWith('camp-1', 'Relicario', expect.any(String)))
  })

  it('fecha o drawer por Escape sem cair no ErrorBoundary', () => {
    renderPage('table_admin')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
