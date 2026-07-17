import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/202607170001_prepare_clean_campaign_copy.sql'), 'utf8')

describe('prepare_clean_campaign_copy migration', () => {
  it('exige autenticação e administração da campanha de origem', () => {
    expect(sql).toContain("if uid is null then raise exception 'AUTH_REQUIRED'")
    expect(sql).toContain("if not public.is_campaign_admin(p_source_campaign_id) then raise exception 'FORBIDDEN'")
    expect(sql).toContain('security definer')
    expect(sql).toContain("set search_path = ''")
  })

  it('bloqueia e arquiva a origem sem apagar seu conteúdo', () => {
    expect(sql).toMatch(/from public\.campaigns where id = p_source_campaign_id for update/)
    expect(sql).toContain("status = 'arquivada'")
    expect(sql).not.toMatch(/delete\s+from\s+public\./i)
    expect(sql).not.toMatch(/truncate/i)
  })

  it('copia contexto, membros, personagens, owner, defesa e especialidades com IDs novos', () => {
    expect(sql).toContain("source_row.premise, '', source_row.current_region_id, '', source_row.active_objectives, source_row.important_notes")
    expect(sql).toContain('select new_row.id, user_id, role, seat')
    expect(sql).toContain('new_row.id, character_row.owner_id')
    expect(sql).toContain('character_row.attributes, character_row.defense')
    expect(sql).toContain('insert into public.character_specialties')
    expect(sql).toContain('character_map := character_map || jsonb_build_object')
  })

  it('reinicia estado e cria somente a Sessão 1 ativa', () => {
    expect(sql).toContain('select new_character_id, vitality_max, vitality_max, resource_max, resource_max')
    expect(sql).toContain("values(new_row.id, 1, '', 'active', uid)")
    expect(sql).not.toContain('insert into public.character_conditions')
    expect(sql).not.toContain('insert into public.campaign_events')
    expect(sql).not.toContain('insert into public.roll_requests')
    expect(sql).not.toContain('insert into public.dice_rolls')
    expect(sql).not.toContain('insert into public.combat_sessions')
    expect(sql).not.toContain('insert into public.gpt_campaign_connections')
  })

  it('é idempotente, detecta cópia incompleta e depende do rollback transacional', () => {
    expect(sql).toContain('where request_id = p_request_id')
    expect(sql).toContain("raise exception 'REQUEST_ID_CONFLICT'")
    expect(sql).toContain("raise exception 'CHARACTER_STATE_MISSING'")
    expect(sql).toContain("raise exception 'CHARACTER_COPY_INCOMPLETE'")
    expect(sql.trim().startsWith('begin;')).toBe(true)
    expect(sql.trim().endsWith('commit;')).toBe(true)
  })

  it('não expõe a tabela técnica nem usa service_role', () => {
    expect(sql).toContain('revoke all on table public.campaign_copy_requests from public, anon, authenticated')
    expect(sql).not.toMatch(/service_role/i)
  })
})
