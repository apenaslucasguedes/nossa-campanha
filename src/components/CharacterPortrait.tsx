import type { IconName } from '../assets/iconRegistry'
import type { ClassKey } from '../types/database'
import { CharacterArtwork } from './CharacterArtwork'
import { Icon } from './Icon'

const classIcons: Record<ClassKey, IconName> = {
  warrior: 'guerreiro',
  arcanist: 'arcanista',
  shadow_blade: 'lamina-sombria',
  necromancer: 'necromante',
  bard: 'bardo',
  druid: 'druida',
}

export function CharacterPortrait({ classKey, name, compact = false }: { classKey: ClassKey; name?: string; compact?: boolean }) {
  return (
    <div className={`character-portrait ${compact ? 'character-portrait--compact' : ''}`} data-character-class={classKey}>
      <CharacterArtwork classKey={classKey} name={name} loading={compact ? 'lazy' : 'eager'} />
      <span className="character-portrait__class-icon" aria-hidden="true">
        <Icon name={classIcons[classKey]} size={compact ? 20 : 24} decorative />
      </span>
    </div>
  )
}
