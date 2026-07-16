// Fase 1 da conexão do GPT Mestre. Autenticação exclusiva por chave de
// campanha no cabeçalho X-Relicario-Key (nunca anon key, JWT fixo, senha ou
// service_role). get_campaign_snapshot é a única fonte do estado da
// campanha; esta função não monta nenhuma consulta própria.
import { failure, json, methodGuard } from '../_shared/http.ts'
import { ApiError } from '../_shared/contracts.ts'
import { resolveCampaignSnapshot } from '../_shared/gptHandlers.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async request => {
  const guarded = methodGuard(request)
  if (guarded) return guarded
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !key) throw new ApiError('MIGRATION_REQUIRED', 'A função ainda não foi configurada no Supabase.', 503)
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const result = await resolveCampaignSnapshot(request, (fn, args) => client.rpc(fn, args))
    if (!result.ok) throw result.error
    return json(request, { ok: true, data: result.data, summary: result.summary })
  } catch (error) {
    return failure(request, error)
  }
})
