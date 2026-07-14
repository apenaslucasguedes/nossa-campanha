import type { IconName } from './iconRegistry'
import { publicAssetUrl } from './publicAssetUrl'
import type { RegionKey } from './regionRegistry'

export const AUREN_MAP_WIDTH = 1591.7 as const
export const AUREN_MAP_HEIGHT = 916.3 as const
export const AUREN_RASTER_WIDTH = 1593 as const
export const AUREN_RASTER_HEIGHT = 916 as const
export const AUREN_VIEW_BOX = `0 0 ${AUREN_MAP_WIDTH} ${AUREN_MAP_HEIGHT}` as const

// O PNG fornecido foi recortado em x=40, y=13 a partir do raster 1672x941.
// Ele é calibrado para o plano lógico do SVG pelo tamanho renderizado, sem
// offset ou transformação própria: X=1591.7/1593 e Y=916.3/916.
export const AUREN_RASTER_CALIBRATION = {
  scaleX:AUREN_MAP_WIDTH/AUREN_RASTER_WIDTH,
  scaleY:AUREN_MAP_HEIGHT/AUREN_RASTER_HEIGHT,
} as const

export const mapRegistry = {
  auren: {
    water: publicAssetUrl('maps/agua.jpg'),
    illustrated: publicAssetUrl('maps/mapa-realista-cortado.png'),
    interactive: publicAssetUrl('maps/mapa-auren.svg'),
    viewBox: AUREN_VIEW_BOX,
    width: AUREN_MAP_WIDTH,
    height: AUREN_MAP_HEIGHT,
    rasterWidth: AUREN_RASTER_WIDTH,
    rasterHeight: AUREN_RASTER_HEIGHT,
    rasterCalibration: AUREN_RASTER_CALIBRATION,
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
  'arquipelago-de-vesper': { name: 'Arquipélago de Vesper', regionKey: 'arquipelago-de-vesper' },
  'ilhas-cinzentas': { name: 'Ilhas Cinzentas', regionKey: 'ilhas-cinzentas' },
  ormara: { name: 'Ormara', regionKey: 'ormara' },
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
