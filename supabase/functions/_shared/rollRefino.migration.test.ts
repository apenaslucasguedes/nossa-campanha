import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/202607160005_roll_request_dedup_and_history.sql'), 'utf8')

describe('migração de refino da Mesa (dedup + modificador + histórico)', () => {
  it('evita solicitação duplicada devolvendo a pendente existente com a mesma combinação', () => {
    // Deduplicação por campanha, sessão, personagem, atributo, especialidade, dificuldade e motivo.
    expect(migration).toContain('r.campaign_id = target_campaign')
    expect(migration).toContain('r.session_id is not distinct from session_row.id')
    expect(migration).toContain('r.requested_character_id = target_character')
    expect(migration).toContain("r.status = 'pending'")
    expect(migration).toContain('r.attribute is not distinct from attribute_value')
    expect(migration).toContain('r.specialty is not distinct from specialty_value')
    expect(migration).toContain('r.difficulty is not distinct from difficulty_value')
    expect(migration).toContain('r.reason = clean_reason')
    // Devolve a existente em vez de inserir outra.
    expect(migration).toMatch(/if found then\s*\n\s*return existing;/)
  })

  it('não apaga registros históricos automaticamente', () => {
    expect(migration).not.toMatch(/delete\s+from/i)
  })

  it('não cria coluna nova para deduplicar', () => {
    expect(migration).not.toMatch(/alter table[\s\S]*add column/i)
  })

  it('aplica o modificador oficial da solicitação, sem confiar no cliente', () => {
    expect(migration).toContain('modifier_value := coalesce(request_row.modifier, 0)')
  })

  it('conclui a solicitação após a rolagem vinculada', () => {
    expect(migration).toContain("update public.roll_requests set status='completed', completed_at=now(), resulting_roll_id=roll_row.id where id=roll_request")
  })

  it('mantém a rolagem visível no snapshot (não marca como teste por padrão)', () => {
    expect(migration).toContain("is_test_value boolean := coalesce((payload->>'is_test')::boolean, false)")
  })

  it('grava resumo de histórico com personagem, teste, dificuldade e resultado', () => {
    expect(migration).toContain("'character_name', character_row.name")
    expect(migration).toContain("'test_label', test_label")
    expect(migration).toContain("'difficulty', difficulty_value")
    expect(migration).toContain("format('%s — %s: resultado %s', character_row.name, test_label, total_value)")
  })
})
