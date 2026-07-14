export const INITIAL_CAMPAIGN_REGION = 'Vale de Ardan'

export function readCurrentRegion(campaign: unknown): string | undefined {
  if (!campaign || typeof campaign !== 'object') return undefined
  const record = campaign as Record<string, unknown>
  const region = record.current_region ?? record.region_name ?? record.region
  if (typeof region === 'string' && region.trim()) return region.trim()
  if (region && typeof region === 'object') {
    const name = (region as Record<string, unknown>).name
    if (typeof name === 'string' && name.trim()) return name.trim()
  }
  return undefined
}
