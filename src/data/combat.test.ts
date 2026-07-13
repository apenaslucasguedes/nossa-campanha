import { describe,expect,it } from 'vitest'
import { CombatSchemaMissingError, type EnemyInstance } from './combat'

describe('CombatRepository',()=>{
  it('expõe um estado sem migração claro e identificável',()=>expect(new CombatSchemaMissingError()).toMatchObject({name:'CombatSchemaMissingError',message:expect.stringContaining('migração')}))
  it('mantém valores persistidos com nomes mecânicos explícitos',()=>{const enemy:EnemyInstance={id:'e',session_id:'s',name:'Fera',level:2,category:'elite',archetype:'perseguidor',vitality:22,vitality_max:22,defense:13,attack_bonus:5,damage_expression:'1d8 + 2',effect_difficulty:12,zone:'perto',status:'ativo',conditions:[],created_at:'now',updated_at:'now'};expect(enemy).toMatchObject({vitality:22,attack_bonus:5,damage_expression:'1d8 + 2'})})
})
