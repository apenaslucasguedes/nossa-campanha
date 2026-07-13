import type { IconName } from './iconRegistry'
import { publicAssetUrl } from './publicAssetUrl'
import type { RegionKey } from './regionRegistry'

export const AUREN_VIEW_BOX = '0 0 1591.67 916.28' as const

export const mapRegistry = {
  auren: {
    illustrated: publicAssetUrl('maps/mapa-realista.png'),
    interactive: publicAssetUrl('maps/mapa-auren.svg'),
    viewBox: AUREN_VIEW_BOX,
  },
} as const

export const aurenRegions = {
  'vale-de-ardan': { name: 'Vale de Ardan', regionKey: 'vale-de-ardan' },
  'floresta-de-nhalor': { name: 'Floresta de Nhalor', regionKey: 'floresta-antiga' },
  'costa-quebrada': { name: 'Costa Quebrada', regionKey: 'costa-quebrada' },
  'cordilheira-de-ferro': { name: 'Cordilheira de Ferro', regionKey: 'cordilheira-de-ferro' },
  'pantanos-de-varg': { name: 'Pântanos de Varg', regionKey: 'pantanos-negros' },
  'deserto-de-sal': { name: 'Deserto de Sal', regionKey: 'deserto-branco' },
  'mar-de-cinzas': { name: 'Mar de Cinzas', regionKey: 'terras-cinzentas' },
  'peninsula-da-aurora': { name: 'Península da Aurora', regionKey: 'peninsula-dos-mosteiros' },
  'estepes-do-norte': { name: 'Estepes do Norte', regionKey: 'estepes-do-norte' },
  'arquipelago-de-vesper': { name: 'Arquipélago de Vesper', regionKey: null },
  'ilhas-cinzentas': { name: 'Ilhas Cinzentas', regionKey: null },
  ormara: { name: 'Ormara', regionKey: null },
} as const satisfies Record<string, { name: string; regionKey: RegionKey | null }>

export type AurenRegionId = keyof typeof aurenRegions
export const aurenRegionIds = Object.keys(aurenRegions) as AurenRegionId[]
export const aurenNonInteractiveLayerIds = ['divisoes-internas', 'contorno-geral'] as const

export type MapMarkerKind = 'metropole'|'cidade'|'vila'|'fortaleza'|'castelo'|'acampamento'|'mosteiro'|'observatorio'|'ruinas'|'caverna'|'mina'|'porto'|'ponte'|'estrada'|'local-revelado'|'missao'|'rumor'|'monstro'|'chefe'|'corrupcao'|'armadilha'|'rota-bloqueada'
export const mapMarkerIcons: Readonly<Record<MapMarkerKind, IconName>> = {
  metropole:'metropole',cidade:'cidade',vila:'vila',fortaleza:'fortaleza',castelo:'castelo',acampamento:'acampamento',mosteiro:'mosteiro',observatorio:'observatorio',ruinas:'ruinas',caverna:'caverna',mina:'mina',porto:'porto',ponte:'ponte-passagem',estrada:'estrada','local-revelado':'local-revelado',missao:'missao',rumor:'rumor',monstro:'monstro',chefe:'chefe',corrupcao:'corrupcao',armadilha:'armadilha','rota-bloqueada':'rota-bloqueada',
}

export function isAurenRegionId(value: string): value is AurenRegionId {
  return Object.hasOwn(aurenRegions, value)
}
