// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Character, RollRequest } from '../types/database'
import { DiceRollWidget } from './DiceRollWidget'

const listPendingRollRequests = vi.fn()
const performDiceRoll = vi.fn()
vi.mock('../data/rolls', () => ({
  listPendingRollRequests: (...a: unknown[]) => listPendingRollRequests(...a),
  performDiceRoll: (...a: unknown[]) => performDiceRoll(...a),
  subscribeToRollRequests: () => ({ topic: 'x' }),
}))
vi.mock('../lib/supabase', () => ({ supabase: { removeChannel: vi.fn() } }))

function character(id: string, name: string, owner: string): Character {
  return {
    id, campaign_id: 'camp-1', owner_id: owner, name, class_key: 'warrior', level: 1,
    presentation: '', origin: '', appearance: '', personality: '', objective: '', fear: '', initial_bond: '', current_bond: '',
    attributes: { strength: 3, agility: 1, intellect: 1, presence: 1, instinct: 2 }, defense: 10, inventory_capacity: 5,
    avatar: { presentation: 'masculina', skinTone: '#000', hair: '#000', primaryColor: '#000', secondaryColor: '#000', accessory: 'nenhum' },
    created_at: '', updated_at: '', character_states: null, character_conditions: [], character_specialties: [],
  }
}

const aldra = character('char-1', 'Aldra', 'u1')
const aelira = character('char-2', 'Aelira', 'u2')

function request(overrides: Partial<RollRequest> = {}): RollRequest {
  return {
    id: 'req-1', campaign_id: 'camp-1', session_id: 's1', requested_character_id: 'char-1', requested_by: 'admin',
    attribute: 'intellect', specialty: 'Investigação', modifier: 3, reason: 'Examinar os símbolos', difficulty: 14,
    status: 'pending', source: 'admin', requested_at: '', completed_at: null, resulting_roll_id: null, ...overrides,
  }
}

beforeEach(() => { vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true })) })
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

describe('DiceRollWidget', () => {
  it('exibe a solicitação completa, preserva roll_request_id e mostra o resultado oficial', async () => {
    listPendingRollRequests.mockResolvedValue([request()])
    performDiceRoll.mockResolvedValue({ character_name: 'Aldra', count: 1, dice: 'd20', modifier: 3, results: [17], total: 20, outcome: 'success' })
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra, aelira]} onResult={vi.fn()} onError={vi.fn()} />)
    const pending = await screen.findByLabelText('Teste pendente')
    expect(pending).toHaveTextContent('Aldra')
    expect(pending).toHaveTextContent('Intelecto + Investigação')
    expect(pending).toHaveTextContent('Dificuldade14')
    expect(pending).toHaveTextContent('Examinar os símbolos')
    expect(pending).toHaveTextContent('Modificador+3')
    fireEvent.click(screen.getByRole('button', { name: 'Rolar teste' }))
    await waitFor(() => expect(performDiceRoll).toHaveBeenCalledWith(expect.objectContaining({ campaign_id: 'camp-1', roll_request_id: 'req-1', dice: 'd20', count: 1, modifier: 3 })))
    expect(await screen.findByText('Sucesso · Total 20')).toBeInTheDocument()
  })

  it.each(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'])('seleciona visualmente %s', async (die) => {
    listPendingRollRequests.mockResolvedValue([])
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra]} onResult={vi.fn()} onError={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: `Selecionar ${die}` }))
    expect(screen.getByRole('button', { name: `Selecionar ${die}` })).toHaveAttribute('aria-pressed', 'true')
  })

  it('preserva quantidade, bloqueia clique duplo e não inventa resultado intermediário', async () => {
    listPendingRollRequests.mockResolvedValue([])
    let resolveRoll!: (value: unknown) => void
    performDiceRoll.mockReturnValue(new Promise((resolve) => { resolveRoll = resolve }))
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra]} onResult={vi.fn()} onError={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '3' } })
    const button = screen.getByRole('button', { name: 'Rolar 3 dados' })
    fireEvent.click(button); fireEvent.click(button)
    expect(performDiceRoll).toHaveBeenCalledTimes(1)
    expect(performDiceRoll).toHaveBeenCalledWith(expect.objectContaining({ dice: 'd20', count: 3 }))
    expect(screen.queryByText('Total 42')).not.toBeInTheDocument()
    resolveRoll({ character_name: 'Aldra', count: 3, dice: 'd20', modifier: 0, results: [12, 14, 16], total: 42, outcome: 'success' })
    expect(await screen.findByText('Sucesso · Total 42')).toBeInTheDocument()
  })

  it('encerra a animação após erro e mantém a solicitação', async () => {
    listPendingRollRequests.mockResolvedValue([request()])
    performDiceRoll.mockRejectedValue(new Error('Falha preservada'))
    const onError = vi.fn()
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra]} onResult={vi.fn()} onError={onError} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rolar teste' }))
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Falha preservada'))
    expect(screen.getByRole('button', { name: 'Rolar teste' })).toBeEnabled()
    expect(screen.getByLabelText('Teste pendente')).toHaveTextContent('Examinar os símbolos')
  })

  it('respeita movimento reduzido', async () => {
    listPendingRollRequests.mockResolvedValue([request()])
    performDiceRoll.mockResolvedValue({ character_name: 'Aldra', count: 1, dice: 'd20', modifier: 3, results: [17], total: 20, outcome: 'success' })
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra]} onResult={vi.fn()} onError={vi.fn()} />)
    expect((await screen.findByText('Monte o conjunto e faça sua rolagem.')).closest('.dice-tray')).toHaveAttribute('data-reduced-motion', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Rolar teste' }))
    expect(await screen.findByText('Sucesso · Total 20')).toBeInTheDocument()
  })

  it('mantém solicitações de outros jogadores apenas como espera', async () => {
    listPendingRollRequests.mockResolvedValue([request({ id: 'req-2', requested_character_id: 'char-2' })])
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra, aelira]} onResult={vi.fn()} onError={vi.fn()} />)
    expect(await screen.findByText('Aguardando a rolagem de Aelira.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rolar teste' })).not.toBeInTheDocument()
  })
})
