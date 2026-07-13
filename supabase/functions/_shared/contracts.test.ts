import { describe,expect,it } from 'vitest'
import { authorizationCode,boundedValue,databaseErrorCode,validateActionRequest } from './contracts'

const campaign_id='11111111-1111-4111-8111-111111111111'
const request_id='22222222-2222-4222-8222-222222222222'
const character_id='33333333-3333-4333-8333-333333333333'
const valid=(action:Record<string,unknown>)=>validateActionRequest({campaign_id,request_id,action})

describe('autorização da API do GPT Mestre',()=>{
  it('nega usuário sem autenticação',()=>expect(authorizationCode(null,null)).toBe('UNAUTHENTICATED'))
  it('nega usuário fora da campanha',()=>expect(authorizationCode('user',null)).toBe('CAMPAIGN_NOT_FOUND'))
  it('permite leitura ao membro',()=>expect(authorizationCode('user','player')).toBeNull())
  it('nega escrita ao jogador',()=>expect(authorizationCode('user','player',true)).toBe('FORBIDDEN'))
  it('permite escrita ao table_admin',()=>expect(authorizationCode('user','table_admin',true)).toBeNull())
})

describe('contrato fechado de ações',()=>{
  it('valida dano e cura e mantém os limites mecânicos',()=>{expect(valid({type:'apply_damage',target_kind:'character',target_id:character_id,amount:3})).toBe(true);expect(valid({type:'apply_healing',target_kind:'character',character_id,amount:3})).toBe(true);expect(boundedValue(2,10,3,'decrease')).toBeNull();expect(boundedValue(9,10,2,'increase')).toBeNull()})
  it('impede recurso abaixo de zero ou acima do máximo',()=>{expect(boundedValue(1,4,2,'decrease')).toBeNull();expect(boundedValue(4,4,1,'increase')).toBeNull();expect(valid({type:'spend_resource',character_id,resource:'Vigor',amount:1})).toBe(true)})
  it('rejeita condição inválida',()=>expect(valid({type:'add_condition',character_id,condition:'Invisível'})).toBe(false))
  it('rejeita alvo com ID inválido antes de consultar a campanha',()=>expect(valid({type:'apply_damage',target_kind:'character',target_id:'outra-campanha',amount:2})).toBe(false))
  it('aceita request_id estável para idempotência e rejeita formato inválido',()=>{const action={type:'end_combat'};expect(validateActionRequest({campaign_id,request_id,action})).toBe(true);expect(validateActionRequest({campaign_id,request_id:'repetir',action})).toBe(false)})
  it('rejeita ação desconhecida',()=>expect(valid({type:'execute_sql',sql:'select 1'})).toBe(false))
  it('mapeia ausência da RPC ou tabela para MIGRATION_REQUIRED',()=>{expect(databaseErrorCode('function does not exist','42883')).toBe('MIGRATION_REQUIRED');expect(databaseErrorCode('table missing','42P01')).toBe('MIGRATION_REQUIRED')})
})
