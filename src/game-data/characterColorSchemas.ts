import type { ShadowProfile } from '../lib/colorDerivation'
import type { ClassKey } from '../types/database'

export type ColorLayer = {
  key: string
  label: string
  groupId: string
  shadowGroupId?: string
  shadowProfile?: ShadowProfile
  order: number
}

export const characterColorSchemas: Record<ClassKey, ColorLayer[]> = {
  arcanist: [
    { key: 'skin', label: 'Tom de pele', groupId: 'cor_pele', shadowGroupId: 'sombra_pele', shadowProfile: 'skin', order: 0 },
    { key: 'hair', label: 'Cabelo', groupId: 'cor_cabelo', shadowGroupId: 'sombra_cabelo', shadowProfile: 'hair', order: 1 },
    { key: 'outfit', label: 'Roupa', groupId: 'cor_roupa', shadowGroupId: 'sombra_roupa', shadowProfile: 'fabric', order: 2 },
    { key: 'cape', label: 'Capa', groupId: 'cor_capa', shadowGroupId: 'sombra_capa', shadowProfile: 'fabric', order: 3 },
    { key: 'staff', label: 'Cajado', groupId: 'cor_cajado', shadowGroupId: 'sombra_cajado', shadowProfile: 'wood', order: 4 },
    { key: 'accessory', label: 'Acessórios', groupId: 'acessorios', order: 5 },
  ],
  bard: [
    { key: 'skin', label: 'Tom de pele', groupId: 'cor_pele', shadowGroupId: 'sombra_pele', shadowProfile: 'skin', order: 0 },
    { key: 'hair', label: 'Cabelo', groupId: 'cabelo', order: 1 },
    { key: 'outfit', label: 'Roupa', groupId: 'cor_roupa', shadowGroupId: 'sombra_roupa', shadowProfile: 'fabric', order: 2 },
    { key: 'accessory', label: 'Acessórios', groupId: 'cor_acessorios', shadowGroupId: 'sombra_acessorios', shadowProfile: 'metal', order: 3 },
    { key: 'strings', label: 'Cordas', groupId: 'cor_cordas', order: 4 },
    { key: 'feather', label: 'Pena', groupId: 'pena', order: 5 },
  ],
  druid: [
    { key: 'skin', label: 'Tom de pele', groupId: 'cor_pele', shadowGroupId: 'sombra_pele', shadowProfile: 'skin', order: 0 },
    { key: 'hair', label: 'Cabelo', groupId: 'cabelo', shadowGroupId: 'sombra_cabelo', shadowProfile: 'hair', order: 1 },
    { key: 'outfit', label: 'Roupa', groupId: 'cor_roupa', shadowGroupId: 'sombra_roupa', shadowProfile: 'fabric', order: 2 },
    { key: 'bear', label: 'Urso', groupId: 'cor_urso', shadowGroupId: 'sombra_urso', shadowProfile: 'hair', order: 3 },
    { key: 'eyes', label: 'Olhos — brilho mágico', groupId: 'olhos', order: 4 },
  ],
  warrior: [
    { key: 'skin', label: 'Tom de pele', groupId: 'cor_pele', shadowGroupId: 'sombra_pele', shadowProfile: 'skin', order: 0 },
    { key: 'armor', label: 'Armadura', groupId: 'cor_armadura', shadowGroupId: 'sombra_armadura', shadowProfile: 'metal', order: 1 },
    { key: 'armorBase', label: 'Base da armadura', groupId: 'base_armadura', shadowProfile: 'metal', order: 2 },
    { key: 'accessory', label: 'Acessórios', groupId: 'cor_acessorios', order: 3 },
    { key: 'belt', label: 'Cinto', groupId: 'cinto', order: 4 },
  ],
  shadow_blade: [
    { key: 'skin', label: 'Tom de pele', groupId: 'cor_pele', shadowGroupId: 'sombra_pele', shadowProfile: 'skin', order: 0 },
    { key: 'hair', label: 'Cabelo', groupId: 'cabelo', order: 1 },
    { key: 'outfit', label: 'Roupa', groupId: 'cor_roupa', shadowGroupId: 'sombra_roupa', shadowProfile: 'fabric', order: 2 },
    { key: 'accessory', label: 'Acessório', groupId: 'cor_acessorio', shadowGroupId: 'sombra_acessorio', shadowProfile: 'metal', order: 3 },
    { key: 'blade', label: 'Lâmina', groupId: 'cor_lamina', shadowGroupId: 'sombra_lamina', shadowProfile: 'metal', order: 4 },
  ],
  necromancer: [
    { key: 'skin', label: 'Tom de pele', groupId: 'cor_pele', shadowGroupId: 'sombra_pele', shadowProfile: 'skin', order: 0 },
    { key: 'outfit', label: 'Roupa', groupId: 'cor_roupa', shadowGroupId: 'sombra_roupa', shadowProfile: 'fabric', order: 1 },
    { key: 'staff', label: 'Cajado', groupId: 'cajado', shadowGroupId: 'sombra_cajado', shadowProfile: 'wood', order: 2 },
    { key: 'accessory', label: 'Brilho mágico', groupId: 'brilho_acessorios', shadowGroupId: 'sombra_acessorios', shadowProfile: 'magic', order: 3 },
  ],
}
