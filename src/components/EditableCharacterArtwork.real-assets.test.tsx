// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { characterRegistry } from '../assets/characterRegistry'
import { characterColorSchemas } from '../game-data/characterColorSchemas'
import type { ClassKey } from '../types/database'
import { EditableCharacterArtwork } from './EditableCharacterArtwork'

function realSvg(classKey: ClassKey): string {
  const filename = characterRegistry[classKey].artwork.split('/').pop() as string
  return readFileSync(join(__dirname, '..', '..', 'public', 'assets', 'characters', filename), 'utf-8')
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('EditableCharacterArtwork com os seis SVGs reais', () => {
  for (const classKey of Object.keys(characterColorSchemas) as ClassKey[]) {
    it(`${classKey}: cada camada recebe apenas sua própria cor, sombras derivam da cor principal`, async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => realSvg(classKey) }))
      const schema = characterColorSchemas[classKey]
      const overrides: Record<string, string> = {}
      schema.forEach((layer, index) => {
        overrides[layer.key] = `#${(index + 1).toString(16).padStart(2, '0')}0000`
      })

      const { container } = render(<EditableCharacterArtwork classKey={classKey} colors={overrides} />)
      await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument())

      for (const layer of schema) {
        const group = container.querySelector(`#${layer.groupId}`)
        expect(group, `grupo ${layer.groupId} deve existir`).toBeTruthy()
        const styledTarget = group?.hasAttribute('style') ? group : group?.querySelector('[style]')
        expect(styledTarget?.getAttribute('style')).toContain(overrides[layer.key])

        if (layer.shadowGroupId) {
          const shadowGroup = container.querySelector(`#${layer.shadowGroupId}`)
          const shadowChild = shadowGroup?.querySelector('[style]')
          const shadowFill = shadowChild?.getAttribute('style') ?? ''
          expect(shadowFill).not.toContain(overrides[layer.key])
          expect(shadowFill).not.toMatch(/fill:\s*#000000/i)
          expect(shadowFill).toMatch(/fill:\s*#[0-9a-f]{6}/i)
        }
      }
    })
  }
})
