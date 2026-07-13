import { publicAssetUrl } from './publicAssetUrl'

const REGIONS = {
  'vale-de-ardan': { name: 'Vale de Ardan', image: publicAssetUrl('regions/vale-de-ardan.webp'), aliases: ['Vale de Ardan'] },
  'floresta-antiga': { name: 'Floresta Antiga', image: publicAssetUrl('regions/vale-de-ardan-floresta-antiga.webp'), aliases: ['Vale de Ardan - Floresta Antiga', 'Floresta de Nhalor'] },
  'costa-quebrada': { name: 'Costa Quebrada', image: publicAssetUrl('regions/costa-quebrada.webp'), aliases: ['Costa Quebrada'] },
  'cordilheira-de-ferro': { name: 'Cordilheira de Ferro', image: publicAssetUrl('regions/cordilheira-de-ferro.webp'), aliases: ['Cordilheira de Ferro'] },
  'pantanos-negros': { name: 'Pântanos Negros', image: publicAssetUrl('regions/pantanos-negros.webp'), aliases: ['Pântanos Negros', 'Pantanos Negros', 'Pântanos de Varg'] },
  'deserto-branco': { name: 'Deserto Branco', image: publicAssetUrl('regions/deserto-branco.webp'), aliases: ['Deserto Branco', 'Deserto de Sal'] },
  'terras-cinzentas': { name: 'Terras Cinzentas', image: publicAssetUrl('regions/terras-cinzentas.webp'), aliases: ['Terras Cinzentas', 'Mar de Cinzas'] },
  'peninsula-dos-mosteiros': { name: 'Península dos Mosteiros', image: publicAssetUrl('regions/peninsula-dos-mosteiros.webp'), aliases: ['Península dos Mosteiros', 'Peninsula dos Mosteiros', 'Península da Aurora'] },
  'estepes-do-norte': { name: 'Estepes do Norte', image: publicAssetUrl('regions/estepes-do-norte.webp'), aliases: ['Estepes do Norte'] },
} as const

export const regionRegistry: Readonly<typeof REGIONS> = REGIONS
export type RegionKey = keyof typeof REGIONS
export const regionKeys = Object.keys(REGIONS) as RegionKey[]

const normalizedAliases = new Map<string, RegionKey>()
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
for (const key of regionKeys) {
  normalizedAliases.set(normalize(key), key)
  normalizedAliases.set(normalize(REGIONS[key].name), key)
  for (const alias of REGIONS[key].aliases) normalizedAliases.set(normalize(alias), key)
}

export function resolveRegionKey(value: string | null | undefined): RegionKey | null {
  return value ? normalizedAliases.get(normalize(value)) ?? null : null
}
