import { describe, expect, it } from 'vitest'
import { advanceTurn, attributeModifier, DIE_SIDES, enemyStats, normalizeConditionDuration, orderInitiative, reorderInitiative, resolveEnemyAttack, rollDice, rollDicePool, tickConditions } from './table'

describe('rolagens da Mesa',()=>{
  it.each(DIE_SIDES)('mantém d%i dentro dos limites',(sides)=>{const result=rollDice(sides,4,0,max=>max-1);expect(result.rolls).toEqual(Array(4).fill(sides))})
  it('aplica modificadores e reconhece naturais',()=>{expect(rollDice(20,1,3,()=>19)).toMatchObject({total:23,critical:true,complication:false,naturalD20:20});expect(rollDice(20,1,-2,()=>0)).toMatchObject({total:-1,critical:false,complication:true,naturalD20:1})})
  it('soma tipos diferentes sem modificador e preserva cada resultado',()=>{expect(rollDicePool({4:2,8:1,20:1},max=>max-1)).toEqual({entries:[{sides:4,rolls:[4,4]},{sides:8,rolls:[8]},{sides:20,rolls:[20]}],quantity:4,total:36})})
  it('calcula atributo sem inventar especialidade',()=>{const attrs={strength:3,agility:1,intellect:0,presence:1,instinct:2};expect(attributeModifier(attrs,'strength','Atletismo',['Atletismo'])).toBe(4);expect(attributeModifier(attrs,'strength','Atletismo',[])).toBe(3)})
})
describe('pendências mecânicas',()=>{
  it('normaliza e reduz duração em rodadas sem alterar cena ou indefinida',()=>{expect(normalizeConditionDuration('rounds',0)).toEqual({kind:'rounds',rounds:1});expect(tickConditions([{name:'Lento',duration:{kind:'rounds',rounds:2}},{name:'Medo',duration:{kind:'scene'}},{name:'Marca',duration:{kind:'indefinite'}}])).toEqual([{name:'Lento',duration:{kind:'rounds',rounds:1}},{name:'Medo',duration:{kind:'scene'}},{name:'Marca',duration:{kind:'indefinite'}}])})
  it('reordena iniciativa manualmente sem mutar a lista',()=>{const source=['a','b','c'];expect(reorderInitiative(source,2,0)).toEqual(['c','a','b']);expect(source).toEqual(['a','b','c'])})
  it('resolve ataque e usa a rolagem de dano, nunca o d20',()=>{const values=[14,2];const result=resolveEnemyAttack(3,15,'1d6 + 2',max=>(values.shift()??0)%max);expect(result.attack.total).toBe(18);expect(result.hit).toBe(true);expect(result.damage?.total).toBe(5);expect(result.damage?.total).not.toBe(result.attack.total)})
  it('não rola dano quando o ataque erra',()=>expect(resolveEnemyAttack(0,20,'1d6 + 1',()=>0)).toMatchObject({hit:false,damage:null}))
})
describe('inimigos e iniciativa',()=>{
  it('usa bases por nível',()=>expect(enemyStats(3,'comum')).toEqual({vitalityMax:15,defense:13,attackBonus:5,damage:'1d8 + 2',effectDifficulty:13}))
  it('aplica categorias',()=>{expect(enemyStats(1,'lacaio')).toMatchObject({vitalityMax:4,defense:10,damage:'1d6 + 0'});expect(enemyStats(5,'chefe')).toMatchObject({vitalityMax:72,defense:16,attackBonus:9,damage:'1d10 + 6'})})
  it('ordena e avança turno e rodada',()=>{expect(orderInitiative([{id:'b',initiative:9},{id:'a',initiative:14}]).map(x=>x.id)).toEqual(['a','b']);expect(advanceTurn(1,2,2)).toEqual({turn:0,round:3})})
})
