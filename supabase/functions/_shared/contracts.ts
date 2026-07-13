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
