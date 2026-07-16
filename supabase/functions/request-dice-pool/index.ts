import { body, failure, json, methodGuard } from '../_shared/http.ts'
import { ApiError } from '../_shared/contracts.ts'
import { resolveDicePoolRequest } from '../_shared/gptHandlers.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async request => {
  const guarded=methodGuard(request)
  if(guarded) return guarded
  try {
    const input=await body(request)
    const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_ANON_KEY')
    if(!url||!key) throw new ApiError('MIGRATION_REQUIRED','A função ainda não foi configurada no Supabase.',503)
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const result=await resolveDicePoolRequest(request,input,(fn,args)=>client.rpc(fn,args))
    if(!result.ok) throw result.error
    return json(request,{ok:true,data:result.data,summary:result.summary})
  } catch(error){ return failure(request,error) }
})
