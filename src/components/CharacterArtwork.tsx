import { useEffect, useState } from 'react'
import { brandRegistry } from '../assets/brandRegistry'
import { characterRegistry, type CharacterClassKey } from '../assets/characterRegistry'
import type { AvatarOptions } from '../types/database'

type CharacterArtworkProps = {
  classKey: CharacterClassKey
  name?: string
  className?: string
  loading?: 'eager' | 'lazy'
  avatar?: AvatarOptions
}

const classColorTargets: Record<CharacterClassKey, { skin: string[]; hair: string[]; primary: string[]; secondary: string[] }> = {
  warrior: {
    skin: ['#edb9b0'],
    hair: [],
    primary: ['#b45353', '#d57370', '#ecad4e'],
    secondary: ['#454557', '#ccdbe0', '#6c849c'],
  },
  arcanist: {
    skin: ['#ebc8b5'],
    hair: ['#863131'],
    primary: ['#5e89e6', '#4db5fa', '#1c6691'],
    secondary: ['#403c73', '#dae5eb', '#e7eded', '#a4bdce'],
  },
  shadow_blade: {
    skin: ['#e8b8ae'],
    hair: ['#813450'],
    primary: ['#4d3482', '#5b5b8a', '#9370b8'],
    secondary: ['#474759', '#39394c', '#39394d', '#2c2c3f', '#d7e2ed'],
  },
  necromancer: {
    skin: ['#e3d4d1', '#a68786'],
    hair: ['#943434', '#bd5151'],
    primary: ['#61758d', '#63c9cf', '#559fa3'],
    secondary: ['#939fad', '#cad4db', '#434356'],
  },
  bard: {
    skin: ['#dac2a6', '#ecb3aa', '#cb9b90'],
    hair: ['#ffc72e', '#ffd43b'],
    primary: ['#ed685f', '#d57370', '#863131'],
    secondary: ['#b26059', '#9eb7cb'],
  },
  druid: {
    skin: ['#ffb9ab'],
    hair: ['#f57f4c'],
    primary: ['#92ab7e', '#485438', '#454558'],
    secondary: ['#b26059', '#863131', '#ffe23b', '#d57370', '#d73e39'],
  },
}

function recolorArtwork(svg: string, classKey: CharacterClassKey, avatar: AvatarOptions) {
  const targets = classColorTargets[classKey]
  let output = svg
  const replacements: Array<[string[], string]> = [
    [targets.skin, avatar.skinTone],
    [targets.hair, avatar.hair],
    [targets.primary, avatar.primaryColor],
    [targets.secondary, avatar.secondaryColor],
  ]

  for (const [colors, value] of replacements) {
    for (const color of colors) {
      output = output.replaceAll(color, value)
    }
  }

  return output
}

export function CharacterArtwork({
  classKey,
  name,
  className = '',
  loading = 'lazy',
  avatar,
}: CharacterArtworkProps) {
  const [failed, setFailed] = useState(false)
  const [inlineSvg, setInlineSvg] = useState('')
  const asset = characterRegistry[classKey]
  const description = name ? `${asset.name} - ${name}` : asset.name

  useEffect(() => {
    if (!avatar || failed) {
      setInlineSvg('')
      return
    }

    let cancelled = false
    void fetch(asset.artwork)
      .then((response) => response.text())
      .then((svg) => {
        if (cancelled) return
        const doc = new DOMParser().parseFromString(recolorArtwork(svg, classKey, avatar), 'image/svg+xml')
        const root = doc.documentElement
        root.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        setInlineSvg(new XMLSerializer().serializeToString(doc))
      })
      .catch(() => {
        if (!cancelled) setInlineSvg('')
      })

    return () => {
      cancelled = true
    }
  }, [asset.artwork, avatar, classKey, failed])

  if (avatar && inlineSvg && !failed) {
    return (
      <figure
        className={`character-artwork character-artwork--inline ${className}`.trim()}
        role="img"
        aria-label={description}
        dangerouslySetInnerHTML={{ __html: inlineSvg }}
      />
    )
  }

  return (
    <figure className={`character-artwork ${failed ? 'is-fallback' : ''} ${className}`.trim()}>
      <img
        src={failed ? brandRegistry.symbol : asset.artwork}
        alt={failed ? `Arte indisponivel para ${description}` : description}
        loading={loading}
        onError={failed ? undefined : () => setFailed(true)}
      />
    </figure>
  )
}
