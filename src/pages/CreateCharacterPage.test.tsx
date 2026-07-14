// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CharacterReview } from '../components/CharacterSections'
import { createMyCharacter } from '../data/campaigns'
import { characterNames } from '../game-data/characterNames'
import { CreateCharacterPage } from './CreateCharacterPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'current-user' } } }) }))
vi.mock('../hooks/useCampaign', () => ({ useCampaign: () => ({ data: { characters: [] }, loading: false }) }))
vi.mock('../data/campaigns', () => ({ createMyCharacter: vi.fn() }))

const FIXTURE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Camada_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 340">
  <defs><style>.st0{fill:#874c3b;}.st1{fill:#4f4037;}.st2{fill:#edb9b0;}</style></defs>
  <g id="cor_armadura"><path class="st0" d="M0 0h10v10H0z"/></g>
  <g id="sombra_armadura"><path class="st0" d="M0 0h10v10H0z"/></g>
  <g id="base_armadura"><path class="st1" d="M0 0h10v10H0z"/></g>
  <g id="cor_acessorios"><path class="st1" d="M0 0h10v10H0z"/></g>
  <g id="cinto"><path class="st1" d="M0 0h10v10H0z"/></g>
  <g id="cor_pele"><path class="st2" d="M0 0h10v10H0z"/></g>
  <g id="sombra_pele"><path class="st2" d="M0 0h10v10H0z"/></g>
</svg>`

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => FIXTURE_SVG }))
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

function fillIdentityStep() {
  fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: 'Aster' } })
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar gênero masculino' }))
  fireEvent.change(screen.getByLabelText(/^Origem/), { target: { value: 'Vale de Ardan' } })
  fireEvent.change(screen.getByLabelText(/^Aparência/), { target: { value: 'Olhos atentos.' } })
  fireEvent.change(screen.getByLabelText(/^Personalidade/), { target: { value: 'Paciente.' } })
  fireEvent.change(screen.getByLabelText(/^Objetivo/), { target: { value: 'Encontrar o relicário.' } })
  fireEvent.change(screen.getByLabelText(/^Medo/), { target: { value: 'Falhar.' } })
}

function advanceToVisualStep(className?: string, specialties = ['Atletismo', 'Intimidação', 'Sobrevivência']) {
  if (className) fireEvent.click(screen.getByRole('button', { name: new RegExp(className) }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // classe -> atributos
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // atributos -> identidade
  fillIdentityStep()
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // identidade -> vínculo
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // vínculo -> especialidades
  for (const specialty of specialties) fireEvent.click(screen.getByRole('checkbox', { name: `Selecionar ${specialty}` }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // especialidades -> visual
}

function advanceToIdentityStep() {
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

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

  it('desabilita o sorteio enquanto nenhum gênero foi informado', () => {
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToIdentityStep()
    expect(screen.getByRole('button', { name: 'Sortear nome — escolha o gênero' })).toBeDisabled()
    expect(screen.getByText('Escolha o gênero para sortear um nome.')).toBeInTheDocument()
  })

  it.each([
    ['Masculino', 'masculino', characterNames.masculine],
    ['Feminino', 'feminino', characterNames.feminine],
  ] as const)('sorteia um nome %s e permite edição manual', (_presentation, label, names) => {
    vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => { values[0] = 0; return values } })
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToIdentityStep()
    fireEvent.click(screen.getByRole('button', { name: `Selecionar gênero ${label}` }))
    fireEvent.click(screen.getByRole('button', { name: `Sortear nome ${label}` }))
    expect(screen.getByLabelText(/^Nome/)).toHaveValue(names[0])
    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: 'Nome editado' } })
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Nome editado')
  })

  it('mantém o nome ao trocar o gênero e usa a nova lista no próximo sorteio', () => {
    vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => { values[0] = 0; return values } })
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToIdentityStep()
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar gênero masculino' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sortear nome masculino' }))
    expect(screen.getByLabelText(/^Nome/)).toHaveValue(characterNames.masculine[0])

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar gênero feminino' }))
    expect(screen.getByLabelText(/^Nome/)).toHaveValue(characterNames.masculine[0])
    expect(screen.getByRole('button', { name: 'Selecionar gênero feminino' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Sortear nome feminino' }))
    expect(screen.getByLabelText(/^Nome/)).toHaveValue(characterNames.feminine[0])
  })

  it('preserva o nome sorteado ao avançar, voltar, revisar e salvar o rascunho', async () => {
    vi.stubGlobal('crypto', { getRandomValues: (values: Uint32Array) => { values[0] = 0; return values } })
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToIdentityStep()
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar gênero masculino' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sortear nome masculino' }))
    const generatedName = characterNames.masculine[0]
    fireEvent.change(screen.getByLabelText(/^Origem/), { target: { value: 'Vale de Ardan' } })
    fireEvent.change(screen.getByLabelText(/^Aparência/), { target: { value: 'Olhos atentos.' } })
    fireEvent.change(screen.getByLabelText(/^Personalidade/), { target: { value: 'Paciente.' } })
    fireEvent.change(screen.getByLabelText(/^Objetivo/), { target: { value: 'Encontrar o relicário.' } })
    fireEvent.change(screen.getByLabelText(/^Medo/), { target: { value: 'Falhar.' } })
    await waitFor(() => expect(sessionStorage.getItem('relicario:create-character-draft')).toContain(generatedName))

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByLabelText(/^Nome/)).toHaveValue(generatedName)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    for (const specialty of ['Atletismo', 'Intimidação', 'Sobrevivência']) fireEvent.click(screen.getByRole('checkbox', { name: `Selecionar ${specialty}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(screen.getByLabelText('Cor de Armadura')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('heading', { name: generatedName })).toBeInTheDocument()
  })

  it('apresenta a revisão completa antes da criação real', () => {
    render(<CharacterReview input={{ name: 'Aster', presentation: 'elu/delu', origin: 'Vale de Ardan', appearance: 'Olhos atentos e capa escura.', personality: 'Paciente e observador.', objective: 'Encontrar o relicário perdido.', fear: 'Falhar com seu vínculo.', bond: 'Amigos', classKey: 'warrior', attributes: { strength: 3, agility: 1, intellect: 0, presence: 1, instinct: 2 }, specialties: ['Atletismo', 'Intimidação', 'Alquimia'] }} derived={{ vitality: 20, defense: 11, inventoryCapacity: 11, resource: 6 }} />)
    expect(screen.getByRole('heading', { name: 'Aster' })).toBeInTheDocument()
    expect(screen.getByText('Esta confirmação cria o personagem real.')).toBeInTheDocument()
    expect(screen.getByText('Atletismo')).toBeInTheDocument()
    expect(screen.getByText('Encontrar o relicário perdido.')).toBeInTheDocument()
  })

  it('mantém a cor escolhida ao avançar para a revisão e ao voltar para a etapa visual', async () => {
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToVisualStep()
    await waitFor(() => expect(screen.getByLabelText('Cor de Armadura')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Cor de Armadura'), { target: { value: '#123456' } })
    expect(screen.getByLabelText('Cor de Armadura')).toHaveValue('#123456')

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // visual -> revisão
    await waitFor(() => expect(screen.getByText('Armadura')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // revisão -> visual
    await waitFor(() => expect(screen.getByLabelText('Cor de Armadura')).toHaveValue('#123456'))
  })

  it('restaura o padrão do SVG ao clicar em restaurar e preserva estado por classe ao trocar e voltar', async () => {
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToVisualStep()
    await waitFor(() => expect(screen.getByLabelText('Cor de Armadura')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Cor de Armadura'), { target: { value: '#123456' } })
    expect(screen.getByLabelText('Cor de Armadura')).toHaveValue('#123456')

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // visual -> especialidades
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> vínculo
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> identidade
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> atributos
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> classe
    fireEvent.click(screen.getByRole('button', { name: /Arcanista/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // classe -> atributos
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> identidade
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> vínculo
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> especialidades
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Arcanismo' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Investigação' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar História' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> visual
    await waitFor(() => expect(screen.getByLabelText('Cor de Cajado')).toBeInTheDocument())
    expect(screen.queryByLabelText('Cor de Armadura')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> especialidades
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> vínculo
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> identidade
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> atributos
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' })) // -> classe
    fireEvent.click(screen.getByRole('button', { name: /Guerreiro/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // classe -> atributos
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> identidade
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> vínculo
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> especialidades
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Atletismo' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Intimidação' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Sobrevivência' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) // -> visual
    await waitFor(() => expect(screen.getByLabelText('Cor de Armadura')).toHaveValue('#123456'))

    const armorControl = screen.getByLabelText('Cor de Armadura').closest('.color-layer-control') as HTMLElement
    fireEvent.click(within(armorControl).getByRole('button', { name: 'Restaurar padrão' }))
    expect(screen.getByLabelText('Cor de Armadura')).not.toHaveValue('#123456')
  })

  it('preserva o rascunho em sessionStorage entre montagens do componente', async () => {
    const { unmount } = render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToVisualStep()
    await waitFor(() => expect(screen.getByLabelText('Cor de Armadura')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Cor de Armadura'), { target: { value: '#654321' } })
    await waitFor(() => expect(sessionStorage.getItem('relicario:create-character-draft')).toContain('654321'))
    unmount()

    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByLabelText('Cor de Armadura')).toHaveValue('#654321'))
  })

  it.each([
    ['Arcanista', ['Arcanismo', 'Investigação', 'História'], 'Tom de pele', '#a86445', 'skin'],
    ['Lâmina Sombria', ['Furtividade', 'Acrobacia', 'Percepção'], 'Cabelo', '#315c78', 'hair'],
    ['Druida', ['Sobrevivência', 'Medicina', 'Rastreamento'], 'Olhos — brilho mágico', '#45d7c4', 'eyes'],
  ])('mantém a personalização específica de %s na revisão, no retorno e no payload final', async (className, specialties, label, color, key) => {
    render(<MemoryRouter><CreateCharacterPage /></MemoryRouter>)
    advanceToVisualStep(className, specialties)

    await waitFor(() => expect(screen.getByLabelText(`Cor de ${label}`)).toBeInTheDocument())
    expect(screen.queryByLabelText('Apresentação')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Acessório visível')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(`Cor de ${label}`), { target: { value: color } })

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText(label)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(screen.getByLabelText(`Cor de ${label}`)).toHaveValue(color))

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar meu personagem' }))
    await waitFor(() => expect(createMyCharacter).toHaveBeenCalledTimes(1))
    expect(vi.mocked(createMyCharacter).mock.calls[0][0].avatar.layerColors).toMatchObject({ [key]: color })
  })
})
