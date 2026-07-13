import { useState } from 'react'
import { brandRegistry } from '../assets/brandRegistry'

type BrandLogoProps = {
  compact?: boolean
  className?: string
  decorative?: boolean
}

export function BrandLogo({ compact = false, className = '', decorative = false }: BrandLogoProps) {
  const [failed, setFailed] = useState(false)
  const label = compact ? 'Símbolo do Relicário' : 'Relicário'

  if (failed) {
    return (
      <span
        className={`brand-logo brand-logo--fallback ${compact ? 'brand-logo--compact' : ''} ${className}`.trim()}
        aria-hidden={decorative || undefined}
      >
        {compact ? 'R' : 'Relicário'}
      </span>
    )
  }

  return (
    <img
      className={`brand-logo ${compact ? 'brand-logo--compact' : ''} ${className}`.trim()}
      src={compact ? brandRegistry.symbol : brandRegistry.logo}
      alt={decorative ? '' : label}
      aria-hidden={decorative || undefined}
      onError={() => setFailed(true)}
    />
  )
}
