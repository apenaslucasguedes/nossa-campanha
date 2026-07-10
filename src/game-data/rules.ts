export type StateLimits = { vitality_current: number; vitality_max: number; resource_current: number; resource_max: number }
export function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max) }
export function applyDamage(state: StateLimits, amount: number) { if (!Number.isFinite(amount) || amount <= 0) return state; return { ...state, vitality_current: clamp(state.vitality_current - Math.floor(amount), 0, state.vitality_max) } }
export function applyHealing(state: StateLimits, amount: number) { if (!Number.isFinite(amount) || amount <= 0) return state; return { ...state, vitality_current: clamp(state.vitality_current + Math.floor(amount), 0, state.vitality_max) } }
export function canControlCharacter(role: 'player' | 'table_admin' | null, userId: string | undefined, ownerId: string) { return role === 'table_admin' || (role === 'player' && userId === ownerId) }
export function canUseTableControls(role: 'player' | 'table_admin' | null) { return role === 'table_admin' }
export const CLASS_KEYS = ['class_1', 'class_2', 'class_3', 'class_4', 'class_5', 'class_6'] as const
