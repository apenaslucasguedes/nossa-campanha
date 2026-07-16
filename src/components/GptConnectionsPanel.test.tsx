// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GptCampaignConnection, GptCampaignConnectionCreated } from '../types/database'

const listGptConnections = vi.fn()
const createGptConnection = vi.fn()
const revokeGptConnection = vi.fn()

vi.mock('../data/gptConnections', () => ({
  listGptConnections: (...args: unknown[]) => listGptConnections(...args),
  createGptConnection: (...args: unknown[]) => createGptConnection(...args),
  revokeGptConnection: (...args: unknown[]) => revokeGptConnection(...args),
  GPT_CONNECTION_PERMISSIONS: ['read_snapshot', 'request_roll'],
}))

const { GptConnectionsPanel } = await import('./GptConnectionsPanel')

const activeConnection: GptCampaignConnection = { id: 'conn-1', campaign_id: 'camp-1', label: 'GPT principal', permissions: ['read_snapshot', 'request_roll'], created_at: '2026-07-16T00:00:00.000Z', last_used_at: null, revoked_at: null }
const createdConnection: GptCampaignConnectionCreated = { id: 'conn-2', raw_key: 'rlk_raw_secret_value', label: 'Nova conexao', permissions: ['read_snapshot', 'request_roll'], created_at: '2026-07-16T00:00:00.000Z' }

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('GptConnectionsPanel', () => {
  it('lista conexoes existentes ao montar', async () => {
    listGptConnections.mockResolvedValueOnce([activeConnection])
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalledWith('camp-1'))
    expect(await screen.findByText('GPT principal')).toBeInTheDocument()
  })

  it('nunca renderiza key_hash nem qualquer trecho de hash na lista', async () => {
    listGptConnections.mockResolvedValueOnce([activeConnection])
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await screen.findByText('GPT principal')
    expect(screen.queryByText(/key_hash/i)).not.toBeInTheDocument()
  })

  it('cria conexao e exibe a chave bruta somente uma vez, com aviso', async () => {
    listGptConnections.mockResolvedValue([])
    createGptConnection.mockResolvedValueOnce(createdConnection)
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Nome da conexão'), { target: { value: 'Nova conexao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conexão' }))

    await waitFor(() => expect(createGptConnection).toHaveBeenCalledWith('camp-1', 'Nova conexao'))
    expect(await screen.findByText('rlk_raw_secret_value')).toBeInTheDocument()
    expect(screen.getByText(/não poderá ser exibida novamente/)).toBeInTheDocument()
  })

  it('cria a conexao sempre com as duas permissoes fixas, sem opcao de escolha', async () => {
    listGptConnections.mockResolvedValue([])
    createGptConnection.mockResolvedValueOnce(createdConnection)
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Nome da conexão'), { target: { value: 'Nova conexao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conexão' }))
    await waitFor(() => expect(createGptConnection).toHaveBeenCalledWith('camp-1', 'Nova conexao'))
    expect(screen.queryByLabelText(/permiss/i)).not.toBeInTheDocument()
  })

  it('copia a chave bruta ao clicar em copiar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    listGptConnections.mockResolvedValue([])
    createGptConnection.mockResolvedValueOnce(createdConnection)
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Nome da conexão'), { target: { value: 'Nova conexao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conexão' }))
    await screen.findByText('rlk_raw_secret_value')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar chave' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('rlk_raw_secret_value'))
  })

  it('apaga a chave da tela ao fechar o aviso', async () => {
    listGptConnections.mockResolvedValue([])
    createGptConnection.mockResolvedValueOnce(createdConnection)
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Nome da conexão'), { target: { value: 'Nova conexao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conexão' }))
    await screen.findByText('rlk_raw_secret_value')
    fireEvent.click(screen.getByRole('button', { name: 'Já copiei, fechar aviso' }))
    expect(screen.queryByText('rlk_raw_secret_value')).not.toBeInTheDocument()
  })

  it('apaga a chave da tela ao desmontar o componente', async () => {
    listGptConnections.mockResolvedValue([])
    createGptConnection.mockResolvedValueOnce(createdConnection)
    const { unmount } = render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Nome da conexão'), { target: { value: 'Nova conexao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conexão' }))
    await screen.findByText('rlk_raw_secret_value')
    unmount()
    expect(screen.queryByText('rlk_raw_secret_value')).not.toBeInTheDocument()
  })

  it('revoga uma conexao ativa somente apos confirmacao', async () => {
    listGptConnections.mockResolvedValue([activeConnection])
    revokeGptConnection.mockResolvedValueOnce(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await screen.findByText('GPT principal')
    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(revokeGptConnection).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }))
    await waitFor(() => expect(revokeGptConnection).toHaveBeenCalledWith('conn-1'))
  })

  it('nao mostra botao de revogar para conexao ja revogada', async () => {
    listGptConnections.mockResolvedValue([{ ...activeConnection, revoked_at: '2026-07-16T01:00:00.000Z' }])
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await screen.findByText('GPT principal')
    expect(screen.queryByRole('button', { name: 'Revogar' })).not.toBeInTheDocument()
    expect(screen.getByText(/Revogada/)).toBeInTheDocument()
  })

  it('exibe erro da RPC de listagem', async () => {
    listGptConnections.mockRejectedValueOnce(new Error('Apenas o administrador da campanha pode ver as conexões do GPT.'))
    render(<GptConnectionsPanel campaignId="camp-1" />)
    expect(await screen.findByText('Apenas o administrador da campanha pode ver as conexões do GPT.')).toBeInTheDocument()
  })

  it('exibe erro da RPC de criacao', async () => {
    listGptConnections.mockResolvedValue([])
    createGptConnection.mockRejectedValueOnce(new Error('Não foi possível criar a conexão do GPT.'))
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Nome da conexão'), { target: { value: 'Nova conexao' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conexão' }))
    expect(await screen.findByText('Não foi possível criar a conexão do GPT.')).toBeInTheDocument()
  })

  it('exibe erro da RPC de revogacao', async () => {
    listGptConnections.mockResolvedValue([activeConnection])
    revokeGptConnection.mockRejectedValueOnce(new Error('Não foi possível revogar a conexão do GPT.'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await screen.findByText('GPT principal')
    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }))
    expect(await screen.findByText('Não foi possível revogar a conexão do GPT.')).toBeInTheDocument()
  })

  it('mostra as URLs das Actions sem usar a chave automaticamente', async () => {
    listGptConnections.mockResolvedValue([])
    render(<GptConnectionsPanel campaignId="camp-1" />)
    await waitFor(() => expect(listGptConnections).toHaveBeenCalled())
    expect(screen.getByText(/campaign-snapshot/)).toBeInTheDocument()
    expect(screen.getByText(/request-dice-roll/)).toBeInTheDocument()
  })
})
