export type StateLimits = { vitality_current: number; vitality_max: number; resource_current: number; resource_max: number }
export function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max) }
export function applyDamage(state: StateLimits, amount: number) { if (!Number.isFinite(amount) || amount <= 0) return state; return { ...state, vitality_current: clamp(state.vitality_current - Math.floor(amount), 0, state.vitality_max) } }
export function applyHealing(state: StateLimits, amount: number) { if (!Number.isFinite(amount) || amount <= 0) return state; return { ...state, vitality_current: clamp(state.vitality_current + Math.floor(amount), 0, state.vitality_max) } }
export function canControlCharacter(role: 'player' | 'table_admin' | null, userId: string | undefined, ownerId: string) { return role === 'table_admin' || (role === 'player' && userId === ownerId) }
export function canUseTableControls(role: 'player' | 'table_admin' | null) { return role === 'table_admin' }
import type { Attributes, Specialty } from '../types/database'
import { ATTRIBUTE_KEYS, getClassDefinition } from './classes'
import type { ClassKey } from '../types/database'

export function isValidAttributeDistribution(attributes: Attributes) { return [...ATTRIBUTE_KEYS.map(key=>attributes[key])].sort((a,b)=>a-b).join(',') === '0,1,1,2,3' }
export function isValidSpecialties(values: readonly Specialty[], suggested: readonly Specialty[]) { return values.length === 3 && new Set(values).size === 3 && values.filter(value=>suggested.includes(value)).length >= 2 }
export function calculateDerived(classKey: ClassKey, attributes: Attributes) { const role=getClassDefinition(classKey); return { vitality: role.baseVitality + attributes.strength * 2 + attributes.instinct, defense: 8 + attributes.agility + attributes.instinct, inventoryCapacity: 5 + attributes.strength * 2, resource: role.baseResource + attributes[role.primary] } }
export function canCreateOwnCharacter(userId:string,requestedOwnerId:string,existingOwnerIds:readonly string[]){return userId===requestedOwnerId&&!existingOwnerIds.includes(userId)}
