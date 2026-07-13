export function publicAssetUrl(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}assets/${path.replace(/^\//, '')}`
}
