import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe,expect,it } from 'vitest'

const migration=readFileSync(resolve(process.cwd(),'supabase/migrations/202607130002_gpt_api_actions.sql'),'utf8')

describe('migração da API do GPT Mestre',()=>{
  it('impede request_id repetido por campanha antes de aplicar novamente',()=>{expect(migration).toContain('game_actions_campaign_request_uidx');expect(migration).toContain('pg_advisory_xact_lock');expect(migration).toContain("'duplicate',true")})
  it('não contorna RLS com service_role ou security definer',()=>{expect(migration).toContain('security invoker');expect(migration).not.toMatch(/service_role|security definer/i)})
})
