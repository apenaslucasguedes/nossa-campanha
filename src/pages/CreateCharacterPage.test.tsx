// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CharacterReview } from '../components/CharacterSections'
import { CreateCharacterPage } from './CreateCharacterPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'current-user' } } }) }))
vi.mock('../hooks/useCampaign', () => ({ useCampaign: () => ({ data: { characters: [] }, loading: false }) }))
vi.mock('../data/campaigns', () => ({ createMyCharacter: vi.fn() }))

afterEach(cleanup)

describe('criação visual de personagem', () => {
  it('renderiza as seis classes com arte, função e seleção explícita', () => {
    const { container } = render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    const cards = container.querySelectorAll('.class-option')
    expect(cards).toHaveLength(6)
    for (const name of ['Guerreiro', 'Arcanista', 'Lâmina Sombria', 'Necromante', 'Bardo', 'Druida']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
    expect(within(cards[0] as HTMLElement).getByText('Classe selecionada')).toBeInTheDocument()
  })

  it('usa três segmentos e permite zerar o atributo ao clicar novamente', () => {
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    const strength = screen.getByRole('group', { name: 'Valor de Força: 3' })
    expect(within(strength).getAllByRole('button')).toHaveLength(3)
    fireEvent.click(within(strength).getByRole('button', { name: 'Zerar Força' }))
    expect(screen.getByRole('group', { name: 'Valor de Força: 0' })).toBeInTheDocument()
  })

  it('apresenta a revisão completa antes da criação real', () => {
    render(<CharacterReview input={{ name: 'Aster', presentation: 'elu/delu', origin: 'Vale de Ardan', appearance: 'Olhos atentos e capa escura.', personality: 'Paciente e observador.', objective: 'Encontrar o relicário perdido.', fear: 'Falhar com seu vínculo.', bond: 'Amigos', classKey: 'warrior', attributes: { strength: 3, agility: 1, intellect: 0, presence: 1, instinct: 2 }, specialties: ['Atletismo', 'Intimidação', 'Alquimia'], avatar: { presentation: 'andrógina', skinTone: '#b97850', hair: '#34251e', primaryColor: '#7f3f36', secondaryColor: '#4f624c', accessory: 'broche' } }} derived={{ vitality: 20, defense: 11, inventoryCapacity: 11, resource: 6 }} />)
    expect(screen.getByRole('heading', { name: 'Aster' })).toBeInTheDocument()
    expect(screen.getByText('Esta confirmação cria o personagem real.')).toBeInTheDocument()
    expect(screen.getByText('Atletismo')).toBeInTheDocument()
    expect(screen.getByText('Encontrar o relicário perdido.')).toBeInTheDocument()
  })
})
