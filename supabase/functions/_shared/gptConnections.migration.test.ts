import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/202607160003_gpt_campaign_connections.sql'), 'utf8')

describe('migração gpt_campaign_connections (fase 1 do GPT Mestre)', () => {
  it('armazena somente o hash da chave, nunca a chave bruta como coluna', () => {
    const tableBlock = migration.match(/create table public\.gpt_campaign_connections \(([\s\S]*?)\n\);/)?.[1] ?? ''
    expect(tableBlock).toContain('key_hash text not null unique')
    expect(tableBlock).not.toMatch(/raw_key/)
    for (const column of ['campaign_id', 'key_hash', 'label', 'permissions', 'created_by', 'created_at', 'last_used_at', 'revoked_at']) {
      expect(tableBlock).toContain(column)
    }
  })

  it('habilita RLS sem nenhuma policy de acesso direto por cliente', () => {
    expect(migration).toContain('alter table public.gpt_campaign_connections enable row level security')
    expect(migration).not.toMatch(/create policy .*gpt_campaign_connections/)
  })

  it('nunca usa service_role', () => {
    expect(migration).not.toMatch(/service_role/i)
  })

  it('rejeita chave inválida ou revogada com o mesmo erro estável (sem oráculo de revogação)', () => {
    expect(migration).toContain("if not found or found_row.revoked_at is not null then raise exception 'GPT_KEY_INVALID'")
  })

  it('rejeita permissão ausente distintamente de chave inválida', () => {
    expect(migration).toContain("if not (required_permission = any(found_row.permissions)) then raise exception 'GPT_KEY_FORBIDDEN'")
  })

  it('rejeita campanha diferente da vinculada à chave em request_dice_roll_for_gpt', () => {
    expect(migration).toContain("if requested_campaign is not null and requested_campaign <> resolved_campaign then raise exception 'CAMPAIGN_MISMATCH'")
  })

  it('rejeita personagem que não pertence à campanha resolvida pela chave', () => {
    expect(migration).toContain("if not exists(select 1 from public.characters where id = target_character and campaign_id = target_campaign) then raise exception 'INVALID_TARGET'")
  })

  it('exige sessão ativa antes de registrar a solicitação de rolagem', () => {
    expect(migration).toContain("if not found then raise exception 'SESSION_INACTIVE'")
  })

  it('concede as funções de leitura/escrita do GPT também para o papel anon, mas restringe a gestão de chaves a authenticated', () => {
    expect(migration).toContain('grant execute on function public.get_campaign_snapshot_for_gpt(text) to anon, authenticated')
    expect(migration).toContain('grant execute on function public.request_dice_roll_for_gpt(text, jsonb) to anon, authenticated')
    expect(migration).toContain('grant execute on function public.create_gpt_campaign_connection(uuid, text, text[]) to authenticated')
    expect(migration).toContain('grant execute on function public.revoke_gpt_campaign_connection(uuid) to authenticated')
    expect(migration).not.toContain('grant execute on function public.create_gpt_campaign_connection(uuid, text, text[]) to anon')
  })

  it('bloqueia consulta arbitrária: as funções internas não têm grant para nenhum papel de cliente', () => {
    expect(migration).toContain('revoke all on function public._campaign_snapshot_payload(uuid) from public')
    expect(migration).not.toMatch(/grant execute on function public\._campaign_snapshot_payload/)
    expect(migration).toContain('revoke all on function public._create_roll_request(uuid, uuid, uuid, text, text, text, integer, text, integer) from public')
    expect(migration).not.toMatch(/grant execute on function public\._create_roll_request/)
  })

  it('reaproveita get_campaign_snapshot como fonte única, sem duplicar a lógica de montagem', () => {
    expect(migration).toContain('return public._campaign_snapshot_payload(target_campaign)')
    expect(migration).toContain('return public._campaign_snapshot_payload(resolved_campaign)')
  })

  it('nunca invoca perform_dice_roll a partir desta migração (só o comentário explica por que não)', () => {
    expect(migration).not.toMatch(/public\.perform_dice_roll\(/)
  })

  it('inclui estado mecânico, combate e rolagens recentes no snapshot, sem inventar campos novos fora do schema existente', () => {
    expect(migration).toContain("'character_states', to_jsonb(cs)")
    expect(migration).toContain("'character_conditions'")
    expect(migration).toContain("'character_specialties'")
    expect(migration).toContain("'participants'")
    expect(migration).toContain("'enemies'")
    expect(migration).toContain("'recent_dice_rolls'")
    expect(migration).toContain("'recent_events'")
  })
})
