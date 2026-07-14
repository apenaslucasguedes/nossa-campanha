import { publicAssetUrl } from '../assets/publicAssetUrl'

export const REGION_DESCRIPTION_FALLBACK = 'Descrição regional ainda não registrada.'

export type RegionDefinition = {
  name: string
  registryName: string
  aliases: readonly string[]
  description: string
  image: string
  assetKey: string
}

export const regions = {
  'vale-de-ardan': { name: 'Vale de Ardan', registryName: 'Vale de Ardan', aliases: ['Vale de Ardan'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/vale-de-ardan.webp'), assetKey: 'vale-de-ardan' },
  'floresta-de-nhalor': { name: 'Floresta de Nhalor', registryName: 'Floresta Antiga', aliases: ['Floresta de Nhalor', 'Floresta Antiga', 'Vale de Ardan - Floresta Antiga'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/vale-de-ardan-floresta-antiga.webp'), assetKey: 'floresta-antiga' },
  'costa-quebrada': { name: 'Costa Quebrada', registryName: 'Costa Quebrada', aliases: ['Costa Quebrada'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/costa-quebrada.webp'), assetKey: 'costa-quebrada' },
  'cordilheira-de-ferro': { name: 'Cordilheira de Ferro', registryName: 'Cordilheira de Ferro', aliases: ['Cordilheira de Ferro'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/cordilheira-de-ferro.webp'), assetKey: 'cordilheira-de-ferro' },
  'pantanos-de-varg': { name: 'Pântanos de Varg', registryName: 'Pântanos Negros', aliases: ['Pântanos de Varg', 'Pântanos Negros', 'Pantanos Negros'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/pantanos-negros.webp'), assetKey: 'pantanos-negros' },
  'deserto-de-sal': { name: 'Deserto de Sal', registryName: 'Deserto Branco', aliases: ['Deserto de Sal', 'Deserto Branco'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/deserto-branco.webp'), assetKey: 'deserto-branco' },
  'mar-de-cinzas': { name: 'Mar de Cinzas', registryName: 'Terras Cinzentas', aliases: ['Mar de Cinzas', 'Terras Cinzentas'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/terras-cinzentas.webp'), assetKey: 'terras-cinzentas' },
  'peninsula-da-aurora': { name: 'Península da Aurora', registryName: 'Península dos Mosteiros', aliases: ['Península da Aurora', 'Península dos Mosteiros', 'Peninsula dos Mosteiros'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/peninsula-dos-mosteiros.webp'), assetKey: 'peninsula-dos-mosteiros' },
  'estepes-do-norte': { name: 'Estepes do Norte', registryName: 'Estepes do Norte', aliases: ['Estepes do Norte'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/estepes-do-norte.webp'), assetKey: 'estepes-do-norte' },
  'arquipelago-de-vesper': { name: 'Arquipélago de Vesper', registryName: 'Arquipélago de Vesper', aliases: ['Arquipélago de Vesper', 'Arquipelago de Vesper'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/Arquipelago de Vesper.png'), assetKey: 'arquipelago-de-vesper' },
  'ilhas-cinzentas': { name: 'Ilhas Cinzentas', registryName: 'Ilhas Cinzentas', aliases: ['Ilhas Cinzentas'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/Ilhas Cinzentas.png'), assetKey: 'ilhas-cinzentas' },
  ormara: { name: 'Ormara', registryName: 'Ormara', aliases: ['Ormara'], description: REGION_DESCRIPTION_FALLBACK, image: publicAssetUrl('regions/Ormara.png'), assetKey: 'ormara' },
} as const satisfies Record<string, RegionDefinition>

export type RegionId = keyof typeof regions
export const regionIds = Object.keys(regions) as RegionId[]
