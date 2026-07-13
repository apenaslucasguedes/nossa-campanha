export function readPlayerName(member: unknown): string | undefined {
  if (!member || typeof member !== 'object') return undefined
  const record = member as Record<string, unknown>
  const direct = record.player_name ?? record.display_name ?? record.name
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const profile = record.profile ?? record.profiles
  if (profile && typeof profile === 'object') {
    const profileRecord = Array.isArray(profile) ? profile[0] : profile
    if (profileRecord && typeof profileRecord === 'object') {
      const nested = (profileRecord as Record<string, unknown>).display_name ?? (profileRecord as Record<string, unknown>).name
      if (typeof nested === 'string' && nested.trim()) return nested.trim()
    }
  }
  return undefined
}
