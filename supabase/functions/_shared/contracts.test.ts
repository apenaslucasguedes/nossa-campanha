import { describe,expect,it } from 'vitest'
import { authorizationCode,boundedValue,databaseErrorCode,validateActionRequest,ApiError,GPT_KEY_HEADER,extractGptKey,sha256Hex,validateGptRollRequest,gptDatabaseErrorCode,gptRpcError } from './contracts'

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

const character_id_2='44444444-4444-4444-8444-444444444444'

describe('chave de conexão do GPT Mestre (fase 1)',()=>{
  it('extrai a chave somente do cabeçalho X-Relicario-Key',()=>{
    expect(extractGptKey(new Request('https://x',{headers:{[GPT_KEY_HEADER]:'rlk_abc'}}))).toBe('rlk_abc')
    expect(extractGptKey(new Request('https://x'))).toBeNull()
    expect(extractGptKey(new Request('https://x',{headers:{[GPT_KEY_HEADER]:'  '}}))).toBeNull()
    expect(extractGptKey(new Request('https://x',{headers:{authorization:'Bearer x'}}))).toBeNull()
  })

  it('gera hash SHA-256 estável e sensível ao valor',async()=>{
    const first=await sha256Hex('rlk_mesma-chave')
    const second=await sha256Hex('rlk_mesma-chave')
    const different=await sha256Hex('rlk_outra-chave')
    expect(first).toBe(second)
    expect(first).not.toBe(different)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
  })

  it('valida teste completo, parcial e simples',()=>{
    expect(validateGptRollRequest({character_id,attribute:'strength'})).toBe(true)
    expect(validateGptRollRequest({character_id,specialty:'Furtividade'})).toBe(true)
    expect(validateGptRollRequest({character_id})).toBe(true)
    expect(validateGptRollRequest({character_id,attribute:'invalida'})).toBe(false)
    expect(validateGptRollRequest({character_id:'nao-e-uuid',attribute:'strength'})).toBe(false)
    expect(validateGptRollRequest({character_id,attribute:'strength',difficulty:31})).toBe(false)
    expect(validateGptRollRequest({character_id,attribute:'strength',modifier:11})).toBe(false)
    expect(validateGptRollRequest({character_id,attribute:'strength',reason:'x'.repeat(241)})).toBe(false)
    expect(validateGptRollRequest({character_id,attribute:'strength',campaign_id})).toBe(true)
    expect(validateGptRollRequest({character_id,attribute:'strength',campaign_id:'invalido'})).toBe(false)
    expect(validateGptRollRequest({character_id,attribute:'strength',unexpected:'x'})).toBe(false)
  })

  it('mapeia erros da RPC de GPT para os códigos estáveis fechados',()=>{
    expect(gptDatabaseErrorCode('GPT_KEY_INVALID','42501')).toBe('UNAUTHENTICATED')
    expect(gptDatabaseErrorCode('GPT_KEY_FORBIDDEN','42501')).toBe('FORBIDDEN')
    expect(gptDatabaseErrorCode('CAMPAIGN_MISMATCH','42501')).toBe('FORBIDDEN')
    expect(gptDatabaseErrorCode('SESSION_INACTIVE','P0001')).toBe('CONFLICT')
    expect(gptDatabaseErrorCode('INVALID_TARGET','P0002')).toBe('INVALID_TARGET')
    expect(gptDatabaseErrorCode('INVALID_REQUEST','22023')).toBe('INVALID_ACTION')
    expect(gptDatabaseErrorCode('function does not exist','42883')).toBe('MIGRATION_REQUIRED')
    expect(gptDatabaseErrorCode('RPC signature mismatch','PGRST202')).toBe('CONFLICT')
    expect(gptDatabaseErrorCode('RPC overload ambiguity','PGRST203')).toBe('CONFLICT')
  })

  it('constrói um ApiError com status HTTP coerente a partir do erro da RPC',()=>{
    const invalid=gptRpcError({message:'GPT_KEY_INVALID'})
    expect(invalid).toBeInstanceOf(ApiError)
    expect(invalid.code).toBe('UNAUTHENTICATED')
    expect(invalid.status).toBe(401)
    const forbidden=gptRpcError({message:'GPT_KEY_FORBIDDEN'})
    expect(forbidden.status).toBe(403)
  })

  it('não confunde o personagem de outro usuário com um alvo válido',()=>{
    expect(validateGptRollRequest({character_id:character_id_2,attribute:'presence'})).toBe(true)
    expect(gptDatabaseErrorCode('INVALID_TARGET')).toBe('INVALID_TARGET')
  })
})
