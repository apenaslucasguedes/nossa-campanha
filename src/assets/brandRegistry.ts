import { publicAssetUrl } from './publicAssetUrl'

export const brandRegistry = {
  logo: publicAssetUrl('brand/logo-relicario.svg'),
  symbol: publicAssetUrl('brand/simbolo-relicario.svg'),
  favicon: publicAssetUrl('brand/favicon.svg'),
} as const

export type BrandAssetName = keyof typeof brandRegistry
