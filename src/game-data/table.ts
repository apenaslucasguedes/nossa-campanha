import type { Attributes, Specialty } from '../types/database'

export const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const
export type DieSides = typeof DIE_SIDES[number]
export type RollResult = { sides: DieSides; quantity: number; modifier: number; rolls: number[]; total: number; naturalD20?: number; critical: boolean; complication: boolean }
export type DicePool = Partial<Record<DieSides, number>>
export type DicePoolResult = { entries: { sides: DieSides; rolls: number[] }[]; quantity: number; total: number }

function randomInt(max: number) {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const limit = Math.floor(0x100000000 / max) * max
    const value = new Uint32Array(1)
    do cryptoApi.getRandomValues(value); while (value[0] >= limit)
    return value[0] % max
  }
  return Math.floor(Math.random() * max)
}

export function rollDice(sides: DieSides, quantity = 1, modifier = 0, random = randomInt): RollResult {
  const count = Math.max(1, Math.min(20, Math.floor(quantity) || 1))
  const rolls = Array.from({ length: count }, () => random(sides) + 1)
  const naturalD20 = sides === 20 && count === 1 ? rolls[0] : undefined
  return { sides, quantity: count, modifier: Math.trunc(modifier) || 0, rolls, total: rolls.reduce((sum, value) => sum + value, 0) + (Math.trunc(modifier) || 0), naturalD20, critical: naturalD20 === 20, complication: naturalD20 === 1 }
}

export function rollDicePool(pool: DicePool, random = randomInt): DicePoolResult {
  const entries = DIE_SIDES.flatMap((sides) => {
    const quantity = Math.max(0, Math.min(20, Math.trunc(pool[sides] ?? 0)))
    return quantity ? [{ sides, rolls: Array.from({ length: quantity }, () => random(sides) + 1) }] : []
  })
  return { entries, quantity: entries.reduce((sum, entry) => sum + entry.rolls.length, 0), total: entries.reduce((sum, entry) => sum + entry.rolls.reduce((subtotal, value) => subtotal + value, 0), 0) }
}

export const SPECIALTY_ATTRIBUTES: Partial<Record<Specialty, keyof Attributes>> = {
  Atletismo:'strength', Acrobacia:'agility', Furtividade:'agility', Investigação:'intellect', Percepção:'instinct', Sobrevivência:'instinct', Medicina:'intellect', Persuasão:'presence', Intimidação:'presence', História:'intellect', Arcanismo:'intellect', Performance:'presence', Rastreamento:'instinct', Alquimia:'intellect'
}
export function attributeModifier(attributes: Attributes, attribute: keyof Attributes, specialty?: Specialty, owned: readonly Specialty[] = []) {
  return attributes[attribute] + (specialty && owned.includes(specialty) && SPECIALTY_ATTRIBUTES[specialty] === attribute ? 1 : 0)
}

export type EnemyLevel = 1|2|3|4|5
export type EnemyCategory = 'lacaio'|'comum'|'elite'|'chefe'
export type Zone = 'corpo a corpo'|'perto'|'distante'|'fora de alcance'
export type EnemyStats = { vitalityMax:number; defense:number; attackBonus:number; damage:string; effectDifficulty:number }
const BASE: Record<EnemyLevel, EnemyStats> = {
  1:{vitalityMax:8,defense:11,attackBonus:3,damage:'1d6 + 1',effectDifficulty:11}, 2:{vitalityMax:11,defense:12,attackBonus:4,damage:'1d6 + 2',effectDifficulty:12}, 3:{vitalityMax:15,defense:13,attackBonus:5,damage:'1d8 + 2',effectDifficulty:13}, 4:{vitalityMax:19,defense:14,attackBonus:6,damage:'1d8 + 3',effectDifficulty:14}, 5:{vitalityMax:24,defense:15,attackBonus:7,damage:'1d10 + 3',effectDifficulty:15}
}
export function enemyStats(level: EnemyLevel, category: EnemyCategory): EnemyStats {
  const base=BASE[level]; const damage=base.damage.match(/(\d+d\d+) \+ (\d+)/)!; const delta={lacaio:-2,comum:0,elite:2,chefe:3}[category]
  const multiplier={lacaio:.5,comum:1,elite:2,chefe:3}[category]
  return { vitalityMax:Math.max(1,Math.round(base.vitalityMax*multiplier)), defense:base.defense+(category==='lacaio'?-1:category==='comum'?0:1), attackBonus:base.attackBonus+(category==='elite'?1:category==='chefe'?2:0), damage:`${damage[1]} + ${Math.max(0,Number(damage[2])+delta)}`, effectDifficulty:base.effectDifficulty }
}
export function clampResource(current:number, delta:number, max:number){return Math.max(0,Math.min(max,current+delta))}
export type InitiativeEntry={id:string;initiative:number}
export function orderInitiative<T extends InitiativeEntry>(items:readonly T[]){return [...items].sort((a,b)=>b.initiative-a.initiative||a.id.localeCompare(b.id))}
export function advanceTurn(turn:number, round:number, count:number){if(count<=0)return{turn:0,round};const next=turn+1;return next>=count?{turn:0,round:round+1}:{turn:next,round}}

export type ConditionDuration = { kind:'rounds'; rounds:number } | { kind:'scene' } | { kind:'indefinite' }
export type MechanicalCondition = { name:string; duration:ConditionDuration }
export function normalizeConditionDuration(kind:ConditionDuration['kind'], rounds=1):ConditionDuration{return kind==='rounds'?{kind,rounds:Math.max(1,Math.trunc(rounds)||1)}:{kind}}
export function tickConditions(conditions:readonly MechanicalCondition[]){return conditions.flatMap(condition=>condition.duration.kind!=='rounds'?condition:condition.duration.rounds<=1?[]:[{...condition,duration:{kind:'rounds' as const,rounds:condition.duration.rounds-1}}])}
export function reorderInitiative<T>(items:readonly T[],from:number,to:number){const next=[...items];if(from<0||to<0||from>=next.length||to>=next.length)return next;const[item]=next.splice(from,1);next.splice(to,0,item);return next}
export function parseDamage(expression:string){const match=expression.match(/^\s*(\d+)d(4|6|8|10|12|20|100)\s*(?:\+\s*(\d+))?\s*$/i);if(!match)throw new Error('Expressão de dano inválida.');return{quantity:Number(match[1]),sides:Number(match[2]) as DieSides,modifier:Number(match[3]??0)}}
export type EnemyAttackResult={attack:RollResult;hit:boolean;damage:RollResult|null}
export function resolveEnemyAttack(attackBonus:number,defense:number,damageExpression:string,random?: (max:number)=>number):EnemyAttackResult{const attack=rollDice(20,1,attackBonus,random);if(attack.total<defense)return{attack,hit:false,damage:null};const damageDice=parseDamage(damageExpression);return{attack,hit:true,damage:rollDice(damageDice.sides,damageDice.quantity,damageDice.modifier,random)}}
