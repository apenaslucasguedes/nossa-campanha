import { useState } from 'react'
import { brandRegistry } from '../assets/brandRegistry'
import { characterRegistry, type CharacterClassKey } from '../assets/characterRegistry'

type CharacterArtworkProps = {
  classKey: CharacterClassKey
  name?: string
  className?: string
  loading?: 'eager' | 'lazy'
}

export function CharacterArtwork({
  classKey,
  name,
  className = '',
  loading = 'lazy',
}: CharacterArtworkProps) {
  const [failed, setFailed] = useState(false)
  const asset = characterRegistry[classKey]
  const description = name ? `${asset.name} — ${name}` : asset.name

  return (
    <figure className={`character-artwork ${failed ? 'is-fallback' : ''} ${className}`.trim()}>
      <img
        src={failed ? brandRegistry.symbol : asset.artwork}
        alt={failed ? `Arte indisponível para ${description}` : description}
        loading={loading}
        onError={failed ? undefined : () => setFailed(true)}
      />
    </figure>
  )
}
