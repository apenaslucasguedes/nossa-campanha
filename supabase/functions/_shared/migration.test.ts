import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe,expect,it } from 'vitest'

const migration=readFileSync(resolve(process.cwd(),'supabase/migrations/202607130002_gpt_api_actions.sql'),'utf8')
const appliedCharacterMigration=readFileSync(resolve(process.cwd(),'supabase/migrations/202607100002_character_creation.sql'),'utf8')
const attributesFixMigration=readFileSync(resolve(process.cwd(),'supabase/migrations/202607130003_fix_valid_initial_attributes.sql'),'utf8')

describe('migração da API do GPT Mestre',()=>{
  it('impede request_id repetido por campanha antes de aplicar novamente',()=>{expect(migration).toContain('game_actions_campaign_request_uidx');expect(migration).toContain('pg_advisory_xact_lock');expect(migration).toContain("'duplicate',true")})
  it('não contorna RLS com service_role ou security definer',()=>{expect(migration).toContain('security invoker');expect(migration).not.toMatch(/service_role|security definer/i)})
  it('não combina variável rowtype com múltiplos destinos no mesmo into',()=>{
    const rowtypeVariables=new Set([...migration.matchAll(/^\s*(\w+)\s+public\.\w+%rowtype;/gmi)].map(match=>match[1].toLowerCase()))
    const invalid=[...migration.matchAll(/\binto\s+([^;\n]+?)\s+from\b/gmi)].filter(match=>{
      const targets=match[1].split(',').map(target=>target.trim().toLowerCase())
      return targets.length>1&&targets.some(target=>rowtypeVariables.has(target))
    })
    expect(invalid).toEqual([])
    expect(migration).toContain('select cs.* into state')
    expect(migration).toContain('select c.class_key into character_class')
  })
})

describe('versionamento de valid_initial_attributes',()=>{
  it('mantém a migração reconciliada no conteúdo considerado aplicado',()=>{
    expect(appliedCharacterMigration).toContain('jsonb_object_length(value)=5')
    expect(appliedCharacterMigration).not.toContain('count(*) from jsonb_object_keys(value)')
  })

  it('reproduz a definição remota somente por migração aditiva',()=>{
    expect(attributesFixMigration).toMatch(/create or replace function public\.valid_initial_attributes\(value jsonb\)/i)
    expect(attributesFixMigration).toContain('(select count(*) from jsonb_object_keys(value)) = 5')
    expect(attributesFixMigration).not.toMatch(/\b(drop|truncate|delete|update|insert)\b/i)
  })
})
