// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditableCharacterArtwork } from './EditableCharacterArtwork'

const FIXTURE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Camada_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 340">
  <defs><style>.st0{fill:#874c3b;}.st1{fill:#4f4037;}</style></defs>
  <g id="cor_armadura"><path class="st0" d="M0 0h10v10H0z"/></g>
  <g id="sombra_armadura"><path class="st0" d="M0 0h10v10H0z"/></g>
  <g id="cor_pele"><path class="st1" d="M0 0h10v10H0z"/></g>
</svg>`

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('EditableCharacterArtwork', () => {
  it('extrai defaults do SVG e aplica a cor escolhida via style.fill', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => FIXTURE_SVG }))
    const onDefaultsLoaded = vi.fn()
    const { container } = render(
      <EditableCharacterArtwork classKey="warrior" colors={{ armor: '#123456' }} onDefaultsLoaded={onDefaultsLoaded} />,
    )
    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument())
    expect(onDefaultsLoaded).toHaveBeenCalledWith(expect.objectContaining({ armor: '#874c3b', skin: '#4f4037' }))
    const armorGroup = container.querySelector('#cor_armadura path')
    expect(armorGroup?.getAttribute('style')).toContain('fill: #123456')
  })

  it('sem overrides, renderiza usando os defaults extraídos do SVG (não uma paleta genérica)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => FIXTURE_SVG }))
    const { container } = render(<EditableCharacterArtwork classKey="warrior" colors={{}} />)
    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument())
    const skinGroup = container.querySelector('#cor_pele path')
    expect(skinGroup?.getAttribute('style')).toContain('fill: #4f4037')
  })

  it('não quebra quando o fetch falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { container } = render(<EditableCharacterArtwork classKey="warrior" colors={{}} />)
    await waitFor(() => expect(container.querySelector('figure')).toBeInTheDocument())
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
