export type ApiErrorCode = 'UNAUTHENTICATED'|'FORBIDDEN'|'CAMPAIGN_NOT_FOUND'|'INVALID_ACTION'|'INVALID_TARGET'|'LIMIT_EXCEEDED'|'CONFLICT'|'MIGRATION_REQUIRED'
export type ApiSuccess<T> = { ok:true; data:T; action_id?:string; summary?:string }
export type ApiFailure = { ok:false; code:ApiErrorCode; message:string; details?:Record<string,unknown> }
export type ApiResponse<T> = ApiSuccess<T>|ApiFailure

export type CampaignRequest = { campaign_id:string }
export type ConditionName = 'Ferido'|'Exausto'|'Amedrontado'|'Envenenado'|'Imobilizado'|'Desorientado'|'Corrompido'|'Caído'
export type Zone = 'corpo a corpo'|'perto'|'distante'|'fora de alcance'
export type EnemyCategory = 'lacaio'|'comum'|'elite'|'chefe'

type CharacterAmount = { target_kind:'character'; character_id:string; amount:number }
type DamageAction = { type:'apply_damage'; target_kind:'character'|'enemy'; target_id:string; amount:number }
type ResourceAction = { type:'spend_resource'|'restore_resource'; character_id:string; resource:string; amount:number }
type ConditionAction = { type:'add_condition'|'remove_condition'; character_id:string; condition:ConditionName }
type CreateEnemyAction = { type:'create_enemy'; name:string; level:1|2|3|4|5; category:EnemyCategory; archetype:string; zone:Zone }
type UpdateEnemyAction = { type:'update_enemy'; enemy_id:string; name?:string; zone?:Zone; status?:'ativo'|'fugiu'|'aliado' }

export type GameAction =
  | DamageAction
  | ({ type:'apply_healing' } & CharacterAmount)
  | ResourceAction
  | ConditionAction
  | { type:'start_combat'|'end_combat'|'advance_turn'|'advance_round' }
  | CreateEnemyAction
  | UpdateEnemyAction
  | { type:'defeat_enemy'; enemy_id:string }

export type ApplyGameActionRequest = CampaignRequest & { request_id:string; action:GameAction }
export type ApplyGameActionResult = { action_id:string; duplicate:boolean; action_type:GameAction['type']; result:Record<string,unknown>; summary:string }
export type CampaignStateData = { campaign:{id:string;name:string;created_at:string}; current_role:'player'|'table_admin'; members:Array<{role:'player'|'table_admin';seat:number;joined_at:string}>; characters:unknown[]; current_region:null }
export type TableStateData = { characters:unknown[]; combat:{session:unknown|null;participants:unknown[];enemies:unknown[]} }
export type WorldStateData = { regions:unknown[]; revealed_locations:unknown[] }

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const CONDITIONS:readonly ConditionName[] = ['Ferido','Exausto','Amedrontado','Envenenado','Imobilizado','Desorientado','Corrompido','Caído']
export const ZONES:readonly Zone[] = ['corpo a corpo','perto','distante','fora de alcance']
export const CATEGORIES:readonly EnemyCategory[] = ['lacaio','comum','elite','chefe']

export class ApiError extends Error{constructor(public code:ApiErrorCode,message:string,public status=400,public details?:Record<string,unknown>){super(message)}}

export const API_ERROR_MESSAGES:Record<ApiErrorCode,string>={UNAUTHENTICATED:'Autenticação válida é obrigatória.',FORBIDDEN:'Você não tem permissão para esta operação.',CAMPAIGN_NOT_FOUND:'Campanha não encontrada.',INVALID_ACTION:'A ação informada não é permitida.',INVALID_TARGET:'O alvo informado não pertence à campanha.',LIMIT_EXCEEDED:'A alteração ultrapassa os limites mecânicos.',CONFLICT:'O estado mudou e a ação não pôde ser aplicada.',MIGRATION_REQUIRED:'A estrutura necessária ainda não foi instalada.'}

export function apiErrorStatus(code:ApiErrorCode):number{return code==='UNAUTHENTICATED'?401:code==='FORBIDDEN'?403:code==='CAMPAIGN_NOT_FOUND'?404:code==='MIGRATION_REQUIRED'?503:code==='CONFLICT'?409:400}

// ---------------------------------------------------------------------------
// Fase 1 da conexão do GPT Mestre: autenticação por chave de campanha via o
// cabeçalho customizado X-Relicario-Key (nunca JWT de usuário, anon key,
// senha ou service_role). Este bloco é livre de imports específicos do Deno
// para permanecer testável por vitest.
// ---------------------------------------------------------------------------

export type GptPermission = 'read_snapshot'|'request_roll'
export const GPT_PERMISSIONS:readonly GptPermission[] = ['read_snapshot','request_roll']
export const GPT_KEY_HEADER = 'x-relicario-key'

export const ATTRIBUTE_NAMES:readonly string[] = ['strength','agility','intellect','presence','instinct']
export const SPECIALTY_NAMES:readonly string[] = ['Atletismo','Acrobacia','Furtividade','Investigação','Percepção','Sobrevivência','Medicina','Persuasão','Intimidação','História','Arcanismo','Performance','Rastreamento','Alquimia']
export const DICE_SIDES = [4,6,8,10,12,20,100] as const

export function extractGptKey(request:Request):string|null{
  const value = request.headers.get(GPT_KEY_HEADER)
  return value && value.trim().length>0 ? value.trim() : null
}

export async function sha256Hex(value:string):Promise<string>{
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('')
}

export type GptRollRequestInput = { campaign_id?:string; character_id:string; attribute?:string; specialty?:string; modifier?:number; reason?:string; difficulty?:number }

export function validateGptRollRequest(value:unknown):value is GptRollRequestInput{
  if(!value || typeof value!=='object') return false
  const input = value as Record<string,unknown>
  if(!isUuid(input.character_id)) return false
  if(input.campaign_id!==undefined && !isUuid(input.campaign_id)) return false
  const attribute = input.attribute
  const specialty = input.specialty
  if(attribute!==undefined && (typeof attribute!=='string' || !ATTRIBUTE_NAMES.includes(attribute))) return false
  if(specialty!==undefined && (typeof specialty!=='string' || !SPECIALTY_NAMES.includes(specialty))) return false
  if(input.modifier!==undefined && (!Number.isInteger(input.modifier) || Number(input.modifier)< -10 || Number(input.modifier)>10)) return false
  if(input.difficulty!==undefined && (!Number.isInteger(input.difficulty) || Number(input.difficulty)<1 || Number(input.difficulty)>30)) return false
  if(input.reason!==undefined && (typeof input.reason!=='string' || input.reason.length>240)) return false
  const allowedKeys = new Set(['campaign_id','character_id','attribute','specialty','modifier','reason','difficulty'])
  return Object.keys(input).every(key=>allowedKeys.has(key))
}

export type GptDicePoolInput = { campaign_id?:string; character_id?:string; dice:Array<{sides:number;quantity:number}>; modifier?:number; reason?:string }
export function validateGptDicePool(value:unknown):value is GptDicePoolInput{
  if(!value || typeof value!=='object') return false
  const input=value as Record<string,unknown>
  if(input.campaign_id!==undefined&&!isUuid(input.campaign_id)) return false
  if(input.character_id!==undefined&&!isUuid(input.character_id)) return false
  if(!Array.isArray(input.dice)||input.dice.length<1||input.dice.length>7) return false
  let total=0
  for(const item of input.dice){
    if(!item||typeof item!=='object') return false
    const die=item as Record<string,unknown>
    if(Object.keys(die).some(key=>!['sides','quantity'].includes(key))||!DICE_SIDES.includes(die.sides as typeof DICE_SIDES[number])||!Number.isInteger(die.quantity)||Number(die.quantity)<1) return false
    total+=Number(die.quantity)
  }
  if(total>20) return false
  if(input.modifier!==undefined&&(!Number.isInteger(input.modifier)||Number(input.modifier)<-20||Number(input.modifier)>20)) return false
  if(input.reason!==undefined&&(typeof input.reason!=='string'||input.reason.length>240)) return false
  return Object.keys(input).every(key=>['campaign_id','character_id','dice','modifier','reason'].includes(key))
}

export function gptDatabaseErrorCode(message:string,code?:string):ApiErrorCode{
  const marker = message.match(/(GPT_KEY_INVALID|GPT_KEY_FORBIDDEN|CAMPAIGN_MISMATCH|SESSION_INACTIVE|INVALID_TARGET|INVALID_REQUEST|INVALID_PERMISSION)/)?.[1]
  switch(marker){
    case 'GPT_KEY_INVALID': return 'UNAUTHENTICATED'
    case 'GPT_KEY_FORBIDDEN': return 'FORBIDDEN'
    case 'CAMPAIGN_MISMATCH': return 'FORBIDDEN'
    case 'SESSION_INACTIVE': return 'CONFLICT'
    case 'INVALID_TARGET': return 'INVALID_TARGET'
    case 'INVALID_REQUEST': case 'INVALID_PERMISSION': return 'INVALID_ACTION'
    default: return databaseErrorCode(message,code)
  }
}

export function gptRpcError(error:{code?:string;message?:string}):ApiError{
  const code = gptDatabaseErrorCode(error.message??'', error.code)
  return new ApiError(code, API_ERROR_MESSAGES[code], apiErrorStatus(code))
}

export function isUuid(value:unknown):value is string{return typeof value==='string'&&UUID_PATTERN.test(value)}
export function authorizationCode(userId:string|null,role:'player'|'table_admin'|null,write=false):ApiErrorCode|null{if(!userId)return'UNAUTHENTICATED';if(!role)return'CAMPAIGN_NOT_FOUND';if(write&&role!=='table_admin')return'FORBIDDEN';return null}
export function databaseErrorCode(message:string,code?:string):ApiErrorCode{const marker=message.match(/(UNAUTHENTICATED|FORBIDDEN|CAMPAIGN_NOT_FOUND|INVALID_ACTION|INVALID_TARGET|LIMIT_EXCEEDED|CONFLICT|MIGRATION_REQUIRED)/)?.[1] as ApiErrorCode|undefined;return marker??(code==='42883'||code==='42P01'||code==='PGRST205'?'MIGRATION_REQUIRED':'CONFLICT')}
export function boundedValue(current:number,max:number,amount:number,direction:'decrease'|'increase'){const next=direction==='decrease'?current-amount:current+amount;return next<0||next>max?null:next}
export function validateCampaignRequest(value:unknown):value is CampaignRequest{return !!value&&typeof value==='object'&&isUuid((value as CampaignRequest).campaign_id)}
export function validateActionRequest(value:unknown):value is ApplyGameActionRequest{
  if(!validateCampaignRequest(value)||!isUuid((value as ApplyGameActionRequest).request_id))return false
  const action=(value as ApplyGameActionRequest).action as GameAction|undefined
  if(!action||typeof action!=='object'||typeof action.type!=='string')return false
  const positive=(amount:unknown)=>Number.isInteger(amount)&&Number(amount)>0&&Number(amount)<=100000
  switch(action.type){
    case 'apply_damage': return isUuid(action.target_id)&&(action.target_kind==='character'||action.target_kind==='enemy')&&positive(action.amount)
    case 'apply_healing': return action.target_kind==='character'&&isUuid(action.character_id)&&positive(action.amount)
    case 'spend_resource': case 'restore_resource': return isUuid(action.character_id)&&typeof action.resource==='string'&&action.resource.length<=30&&positive(action.amount)
    case 'add_condition': case 'remove_condition': return isUuid(action.character_id)&&CONDITIONS.includes(action.condition)
    case 'start_combat': case 'end_combat': case 'advance_turn': case 'advance_round': return Object.keys(action).length===1
    case 'create_enemy': return typeof action.name==='string'&&action.name.trim().length>0&&action.name.length<=60&&Number.isInteger(action.level)&&action.level>=1&&action.level<=5&&CATEGORIES.includes(action.category)&&typeof action.archetype==='string'&&action.archetype.trim().length>0&&action.archetype.length<=40&&ZONES.includes(action.zone)
    case 'update_enemy': return isUuid(action.enemy_id)&&Object.keys(action).length>2&&(action.name===undefined||(typeof action.name==='string'&&action.name.trim().length>0&&action.name.length<=60))&&(action.zone===undefined||ZONES.includes(action.zone))&&(action.status===undefined||['ativo','fugiu','aliado'].includes(action.status))&&Object.keys(action).every(key=>['type','enemy_id','name','zone','status'].includes(key))
    case 'defeat_enemy': return isUuid(action.enemy_id)
    default:return false
  }
}
