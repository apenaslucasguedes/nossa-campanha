// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../types/database'
import { RollRequestPanel } from './RollRequestPanel'

const requestRoll = vi.fn()
vi.mock('../data/rolls', () => ({ requestRoll: (...args: unknown[]) => requestRoll(...args) }))

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1', campaign_id: 'camp-1', owner_id: 'u1', name: 'Aldra', class_key: 'arcanist', level: 1,
    presentation: '', origin: '', appearance: '', personality: '', objective: '', fear: '', initial_bond: '', current_bond: '',
    attributes: { strength: 0, agility: 1, intellect: 3, presence: 1, instinct: 2 }, defense: 10, inventory_capacity: 5,
    avatar: { presentation: 'feminina', skinTone: '#000', hair: '#000', primaryColor: '#000', secondaryColor: '#000', accessory: 'nenhum' },
    created_at: '', updated_at: '', character_states: null, character_conditions: [],
    character_specialties: [
      { character_id: 'char-1', name: 'Investigação', source: 'class', created_at: '' },
      { character_id: 'char-1', name: 'Arcanismo', source: 'class', created_at: '' },
    ],
    ...overrides,
  }
}

const aelira = character({ id: 'char-2', name: 'Aelira', character_specialties: [{ character_id: 'char-2', name: 'Furtividade', source: 'class', created_at: '' }] })

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('RollRequestPanel', () => {
  it('permanece como botão compacto e só abre o painel ao clicar', () => {
    render(<RollRequestPanel campaignId="camp-1" characters={[character()]} onError={vi.fn()} onRequested={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Solicitar teste' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar teste' }))
    expect(screen.getByRole('dialog', { name: 'Solicitar teste' })).toBeInTheDocument()
  })

  it('usa apenas as especialidades reais do personagem selecionado, sem texto livre', () => {
    render(<RollRequestPanel campaignId="camp-1" characters={[character(), aelira]} onError={vi.fn()} onRequested={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar teste' }))
    const specialtySelect = screen.getByRole('combobox', { name: 'Especialidade' })
    expect(specialtySelect.tagName).toBe('SELECT')
    const options = within(specialtySelect).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Nenhuma', 'Investigação', 'Arcanismo'])
    // Troca para outro personagem: a lista passa a refletir as especialidades dele.
    fireEvent.change(screen.getByRole('combobox', { name: 'Personagem' }), { target: { value: 'char-2' } })
    expect(within(specialtySelect).getAllByRole('option').map((o) => o.textContent)).toEqual(['Nenhuma', 'Furtividade'])
    // Atributo também é um select fechado (cinco atributos).
    const attributeSelect = screen.getByRole('combobox', { name: 'Atributo' })
    expect(within(attributeSelect).getAllByRole('option').map((o) => o.textContent)).toEqual(['Nenhum', 'Força', 'Agilidade', 'Intelecto', 'Presença', 'Instinto'])
  })

  it('solicita, fecha o painel e confirma de forma curta', async () => {
    requestRoll.mockResolvedValue({ id: 'req-1' })
    const onRequested = vi.fn()
    render(<RollRequestPanel campaignId="camp-1" characters={[character()]} onError={vi.fn()} onRequested={onRequested} />)
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar teste' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Atributo' }), { target: { value: 'intellect' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Especialidade' }), { target: { value: 'Investigação' } })
    fireEvent.change(screen.getByLabelText('Dificuldade'), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Examinar os símbolos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar' }))
    await waitFor(() => expect(requestRoll).toHaveBeenCalledWith(expect.objectContaining({ campaign_id: 'camp-1', character_id: 'char-1', attribute: 'intellect', specialty: 'Investigação', difficulty: 14, reason: 'Examinar os símbolos' })))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onRequested).toHaveBeenCalledWith('Teste solicitado a Aldra.')
  })
})
