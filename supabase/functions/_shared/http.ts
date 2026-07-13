import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { databaseErrorCode, type ApiErrorCode, type ApiFailure, type ApiResponse } from './contracts.ts'

export class ApiError extends Error{constructor(public code:ApiErrorCode,message:string,public status=400,public details?:Record<string,unknown>){super(message)}}
const messages:Record<ApiErrorCode,string>={UNAUTHENTICATED:'Autenticação válida é obrigatória.',FORBIDDEN:'Você não tem permissão para esta operação.',CAMPAIGN_NOT_FOUND:'Campanha não encontrada.',INVALID_ACTION:'A ação informada não é permitida.',INVALID_TARGET:'O alvo informado não pertence à campanha.',LIMIT_EXCEEDED:'A alteração ultrapassa os limites mecânicos.',CONFLICT:'O estado mudou e a ação não pôde ser aplicada.',MIGRATION_REQUIRED:'A estrutura necessária ainda não foi instalada.'}

function corsHeaders(request:Request){const origin=request.headers.get('origin');const allowed=(Deno.env.get('GPT_API_ALLOWED_ORIGINS')??'').split(',').map(v=>v.trim()).filter(Boolean);return origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}:{'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
export function json<T>(request:Request,body:ApiResponse<T>,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8',...corsHeaders(request)}})}
export function failure(request:Request,error:unknown){if(error instanceof ApiError)return json(request,{ok:false,code:error.code,message:error.message,details:error.details},error.status);console.error('GPT API request failed without sensitive request data');return json(request,{ok:false,code:'CONFLICT',message:'A operação não pôde ser concluída.'},500)}
export function preflight(request:Request){return new Response(null,{status:204,headers:corsHeaders(request)})}
export async function body(request:Request):Promise<unknown>{try{return await request.json()}catch{throw new ApiError('INVALID_ACTION','O corpo da requisição deve ser JSON válido.',400)}}

export async function authenticatedClient(request:Request):Promise<{client:SupabaseClient;userId:string}>{
  const authorization=request.headers.get('authorization')
  if(!authorization?.startsWith('Bearer '))throw new ApiError('UNAUTHENTICATED',messages.UNAUTHENTICATED,401)
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY')
  if(!url||!key)throw new ApiError('MIGRATION_REQUIRED','A função ainda não foi configurada no Supabase.',503)
  const client=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await client.auth.getUser()
  if(error||!data.user)throw new ApiError('UNAUTHENTICATED',messages.UNAUTHENTICATED,401)
  return{client,userId:data.user.id}
}
export async function requireMembership(client:SupabaseClient,campaignId:string,admin=false){
  const {data,error}=await client.from('campaign_members').select('role').eq('campaign_id',campaignId).maybeSingle()
  if(error)throw new ApiError(error.code==='42P01'?'MIGRATION_REQUIRED':'CONFLICT',error.code==='42P01'?messages.MIGRATION_REQUIRED:'Não foi possível validar a campanha.',error.code==='42P01'?503:409)
  if(!data)throw new ApiError('CAMPAIGN_NOT_FOUND',messages.CAMPAIGN_NOT_FOUND,404)
  if(admin&&data.role!=='table_admin')throw new ApiError('FORBIDDEN',messages.FORBIDDEN,403)
  return data.role as 'player'|'table_admin'
}
export function rpcError(error:{code?:string;message?:string}){const code=databaseErrorCode(error.message??'',error.code);const status=code==='UNAUTHENTICATED'?401:code==='FORBIDDEN'?403:code==='CAMPAIGN_NOT_FOUND'?404:code==='MIGRATION_REQUIRED'?503:code==='CONFLICT'?409:400;return new ApiError(code,messages[code],status)}
export function methodGuard(request:Request){if(request.method==='OPTIONS')return preflight(request);if(request.method!=='POST')return json(request,{ok:false,code:'INVALID_ACTION',message:'Método não permitido.'} as ApiFailure,405);return null}
