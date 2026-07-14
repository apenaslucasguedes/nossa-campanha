import { useState, type CSSProperties } from 'react'
import { brandRegistry } from '../assets/brandRegistry'
import { iconRegistry, type IconName } from '../assets/iconRegistry'

type IconProps = {
  name: IconName
  size?: number | string
  title?: string
  decorative?: boolean
  className?: string
}

export function Icon({
  name,
  size = 24,
  title,
  decorative = false,
  className = '',
}: IconProps) {
  const [failed, setFailed] = useState(false)
  const asset = iconRegistry[name]
  const accessibleName = title ?? asset.label
  const dimension = typeof size === 'number' ? `${size}px` : size

  return (
    <img
      className={`icon ${failed ? 'icon--fallback' : ''} ${className}`.trim()}
      src={failed ? brandRegistry.symbol : asset.path}
      width={size}
      height={size}
      alt={decorative ? '' : failed ? `Ícone indisponível: ${accessibleName}` : accessibleName}
      title={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      data-fallback={failed || undefined}
      style={{ '--icon-size': dimension } as CSSProperties}
      onError={failed ? undefined : () => setFailed(true)}
    />
  )
}
