import type { CSSProperties } from 'react'
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
  const asset = iconRegistry[name]
  const accessibleName = title ?? asset.label
  const dimension = typeof size === 'number' ? `${size}px` : size

  const style = { '--icon-size': dimension, '--icon-source': `url("${asset.path}")` } as CSSProperties

  return <span className={`icon ${className}`.trim()} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : accessibleName} title={decorative ? undefined : title} aria-hidden={decorative || undefined} style={style} />
}
