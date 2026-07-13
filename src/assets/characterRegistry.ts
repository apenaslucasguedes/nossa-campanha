import type { ClassKey } from '../types/database'
import { publicAssetUrl } from './publicAssetUrl'

const CHARACTERS = {
  warrior: { name: 'Guerreiro', artwork: publicAssetUrl('characters/guerreiro.svg') },
  arcanist: { name: 'Arcanista', artwork: publicAssetUrl('characters/arcanista.svg') },
  shadow_blade: { name: 'Lâmina Sombria', artwork: publicAssetUrl('characters/lamina-sombria.svg') },
  necromancer: { name: 'Necromante', artwork: publicAssetUrl('characters/necromante.svg') },
  bard: { name: 'Bardo', artwork: publicAssetUrl('characters/bardo.svg') },
  druid: { name: 'Druida', artwork: publicAssetUrl('characters/druida.svg') },
} as const satisfies Record<ClassKey, { name: string; artwork: string }>

export const characterRegistry: Readonly<typeof CHARACTERS> = CHARACTERS
export type CharacterClassKey = keyof typeof CHARACTERS
