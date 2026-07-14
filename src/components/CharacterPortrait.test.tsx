// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CharacterPortrait } from './CharacterPortrait'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><style>.armor{fill:#874c3b}</style><g id="cor_armadura"><path class="armor" d="M0 0h10v10H0z"/></g></svg>'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('retrato persistido do personagem', () => {
  it('reaplica as cores por camada salvas no avatar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => SVG }))
    const { container } = render(
      <CharacterPortrait
        classKey="warrior"
        name="Ayla"
        avatar={{
          presentation: 'feminina',
          skinTone: '#b97850',
          hair: '#34251e',
          primaryColor: '#7f3f36',
          secondaryColor: '#4f624c',
          accessory: 'broche',
          layerColors: { armor: '#123456' },
        }}
      />,
    )

    await waitFor(() => expect(container.querySelector('#cor_armadura path')).toHaveAttribute('style', expect.stringContaining('fill: #123456')))
  })
})
