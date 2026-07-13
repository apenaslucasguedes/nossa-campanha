import { useState } from 'react'
import { regionRegistry, resolveRegionKey, type RegionKey } from '../assets/regionRegistry'

type RegionArtworkProps = {
  region: RegionKey | string
  className?: string
  alt?: string
  loading?: 'eager' | 'lazy'
}

export function RegionArtwork({ region, className = '', alt, loading = 'lazy' }: RegionArtworkProps) {
  const [failed, setFailed] = useState(false)
  const key = (region in regionRegistry ? region : resolveRegionKey(region)) as RegionKey | null
  const asset = key ? regionRegistry[key] : null

  if (!asset || failed) {
    return <div className={`region-artwork region-artwork--fallback ${className}`.trim()} role="img" aria-label={alt ?? 'Imagem de região indisponível'} />
  }

  return (
    <figure className={`region-artwork ${className}`.trim()}>
      <img src={asset.image} alt={alt ?? asset.name} loading={loading} onError={() => setFailed(true)} />
    </figure>
  )
}
