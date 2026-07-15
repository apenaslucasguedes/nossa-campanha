import type { IconName } from '../assets/iconRegistry'
import type { AvatarOptions, ClassKey } from '../types/database'
import { CharacterArtwork } from './CharacterArtwork'
import { EditableCharacterArtwork } from './EditableCharacterArtwork'
import { Icon } from './Icon'

const classIcons: Record<ClassKey, IconName> = {
  warrior: 'guerreiro',
  arcanist: 'arcanista',
  shadow_blade: 'lamina-sombria',
  necromancer: 'necromante',
  bard: 'bardo',
  druid: 'druida',
}

export function CharacterPortrait({ classKey, name, compact = false, avatar }: { classKey: ClassKey; name?: string; compact?: boolean; avatar?: AvatarOptions }) {
  const layerColors = avatar?.layerColors
  const hasLayerColors = Boolean(layerColors && Object.keys(layerColors).length)
  return (
    <div className={`character-portrait ${compact ? 'character-portrait--compact' : ''}`} data-character-class={classKey}>
      {hasLayerColors ? <EditableCharacterArtwork classKey={classKey} colors={layerColors!} /> : <CharacterArtwork classKey={classKey} name={name} loading={compact ? 'lazy' : 'eager'} avatar={avatar} />}
      <span className="character-portrait__class-icon" aria-hidden="true">
        <Icon name={classIcons[classKey]} size={compact ? 20 : 24} decorative />
      </span>
    </div>
  )
}
