// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('DiceRollWidget', () => {
  it('preenche a rolagem pendente com os dados da solicitação e rola pelo roll_request_id', async () => {
    listPendingRollRequests.mockResolvedValue([request()])
    performDiceRoll.mockResolvedValue({ character_name: 'Aldra', count: 1, dice: 'd20', total: 17 })
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra, aelira]} onResult={vi.fn()} onError={vi.fn()} />)

    const pending = await screen.findByLabelText('Teste pendente')
    expect(pending).toHaveTextContent('Aldra')
    expect(pending).toHaveTextContent('Intelecto + Investigação')
    expect(pending).toHaveTextContent('dificuldade 14')
    expect(pending).toHaveTextContent('Examinar os símbolos')
    expect(pending).toHaveTextContent('Modificador +3')

    fireEvent.click(screen.getByRole('button', { name: 'Rolar teste' }))
    await waitFor(() => expect(performDiceRoll).toHaveBeenCalledWith(expect.objectContaining({ campaign_id: 'camp-1', roll_request_id: 'req-1', dice: 'd20', count: 1, modifier: 3 })))
  })

  it('não deixa o jogador rolar pelo personagem do outro, apenas mostra aguardo discreto', async () => {
    listPendingRollRequests.mockResolvedValue([request({ id: 'req-2', requested_character_id: 'char-2' })])
    render(<DiceRollWidget campaignId="camp-1" ownCharacter={aldra} characters={[aldra, aelira]} onResult={vi.fn()} onError={vi.fn()} />)
    expect(await screen.findByText('Aguardando a rolagem de Aelira.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rolar teste' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Teste pendente')).not.toBeInTheDocument()
  })
})
