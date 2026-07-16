function key(userId: string) {
  return `relicario:${userId}:lastCampaignId`
}

export function rememberLastCampaign(userId: string, campaignId: string) {
  try { localStorage.setItem(key(userId), campaignId) } catch { /* ignore storage failures */ }
}

export function readLastCampaign(userId: string): string | null {
  try { return localStorage.getItem(key(userId)) } catch { return null }
}
