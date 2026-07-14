import { regionIds, regions } from '../game-data/regions'

const REGIONS = Object.fromEntries(regionIds.map((id)=>{const region=regions[id];return [region.assetKey,{name:region.registryName,image:region.image,aliases:region.aliases}]})) as unknown as Record<(typeof regions)[typeof regionIds[number]]['assetKey'],{name:string;image:string;aliases:readonly string[]}>

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
