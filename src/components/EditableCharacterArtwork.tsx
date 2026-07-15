import { useEffect, useState } from 'react'
import { characterRegistry, type CharacterClassKey } from '../assets/characterRegistry'
import { characterColorSchemas } from '../game-data/characterColorSchemas'
import { deriveShadow } from '../lib/colorDerivation'

type EditableCharacterArtworkProps = {
  classKey: CharacterClassKey
  colors: Record<string, string>
  size?: number
  className?: string
  decorative?: boolean
  onLoadError?: () => void
  onDefaultsLoaded?: (defaults: Record<string, string>) => void
}

function extractStyleFillMap(doc: Document): Map<string, string> {
  const map = new Map<string, string>()
  const styleText = doc.querySelector('style')?.textContent ?? ''
  const ruleRegex = /\.([^\s{,]+)\s*\{[^}]*fill:\s*(#[0-9a-fA-F]{3,8})/g
  let match: RegExpExecArray | null
  while ((match = ruleRegex.exec(styleText))) {
    map.set(match[1], match[2])
  }
  return map
}

function resolveGroupColor(doc: Document, groupId: string, fillMap: Map<string, string>): string | null {
  const group = doc.getElementById(groupId)
  if (!group) return null
  const elementWithClass = group.hasAttribute('class') ? group : group.querySelector('[class]')
  const className = elementWithClass?.getAttribute('class')
  if (className && fillMap.has(className)) return fillMap.get(className) ?? null
  const elementWithFill = group.hasAttribute('fill') ? group : group.querySelector('[fill]')
  return elementWithFill?.getAttribute('fill') ?? null
}

function applyGroupFill(doc: Document, groupId: string, color: string) {
  const group = doc.getElementById(groupId)
  if (!group) return
  const targets = [group, ...Array.from(group.querySelectorAll('*'))]
  for (const element of targets) {
    element.setAttribute('style', `fill: ${color};`)
  }
}

export function EditableCharacterArtwork({
  classKey,
  colors,
  size,
  className = '',
  decorative = false,
  onLoadError,
  onDefaultsLoaded,
}: EditableCharacterArtworkProps) {
  const [failed, setFailed] = useState(false)
  const [inlineSvg, setInlineSvg] = useState('')
  const asset = characterRegistry[classKey]
  const schema = characterColorSchemas[classKey]
  const description = asset.name

  useEffect(() => {
    let cancelled = false
    void fetch(asset.artwork)
      .then((response) => response.text())
      .then((svgText) => {
        if (cancelled) return
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
        if (doc.querySelector('parsererror')) throw new Error('invalid svg')
        const fillMap = extractStyleFillMap(doc)
        const defaults: Record<string, string> = {}

        for (const layer of schema) {
          const defaultColor = resolveGroupColor(doc, layer.groupId, fillMap)
          if (defaultColor) defaults[layer.key] = defaultColor
          const activeColor = colors[layer.key] ?? defaultColor
          if (activeColor) applyGroupFill(doc, layer.groupId, activeColor)
          if (layer.shadowGroupId && layer.shadowProfile && activeColor) {
            applyGroupFill(doc, layer.shadowGroupId, deriveShadow(activeColor, layer.shadowProfile))
          }
        }

        if (onDefaultsLoaded) onDefaultsLoaded(defaults)
        setInlineSvg(new XMLSerializer().serializeToString(doc))
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          onLoadError?.()
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.artwork, classKey, JSON.stringify(colors)])

  if (failed || !inlineSvg) {
    return <figure className={`character-artwork character-artwork--editable avatar-media ${className}`.trim()} style={size ? { width: size, height: size } : undefined} aria-hidden={decorative || undefined} />
  }

  return (
    <figure
      className={`character-artwork character-artwork--editable avatar-media ${className}`.trim()}
      style={size ? { width: size, height: size } : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : description}
      aria-hidden={decorative || undefined}
      dangerouslySetInnerHTML={{ __html: inlineSvg }}
    />
  )
}
