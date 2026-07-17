import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/202607160007_fix_simple_roll_execution.sql'), 'utf8')
const snapshotMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/202607160003_gpt_campaign_connections.sql'), 'utf8')

describe('execução de teste simples pendente', () => {
  it('itera o JSON sem ambiguidade entre variável e coluna', () => {
    expect(migration).toContain('rolled_value integer')
    expect(migration).toContain('select die.value from jsonb_array_elements(spec) as die(value)')
    expect(migration).not.toMatch(/\bvalue integer\b/)
  })

  it('gera exatamente 1d20 para character_test e preserva dice pools', () => {
    expect(migration).toContain("case when request_row.request_kind='dice_pool' then request_row.dice_spec else '[{\"sides\":20,\"quantity\":1}]'::jsonb end")
    expect(migration).toContain("when request_row.request_kind='dice_pool' then label")
  })

  it('usa modificador zero, dificuldade e outcome da solicitação', () => {
    expect(migration).toContain('modifier_value:=request_row.modifier')
    expect(migration).toContain('total_value:=subtotal_value+modifier_value')
    expect(migration).toContain("total_value>=request_row.difficulty then 'success' else 'failure'")
  })

  it('persiste o vínculo e conclui a pendência', () => {
    expect(migration).toContain('rolled_by,roll_request_id,request_kind')
    expect(migration).toContain("update public.roll_requests set status='completed',completed_at=now(),resulting_roll_id=roll_row.id where id=request_id")
  })

  it('registra um único evento coerente sem null ou separadores vazios', () => {
    expect(migration.match(/insert into public\.campaign_events/g)).toHaveLength(1)
    expect(migration).toContain("coalesce(public._roll_test_label(request_row.attribute,request_row.specialty),'Teste simples')")
    expect(migration).toContain("character_row.name||' — '||test_label")
    expect(migration).not.toMatch(/\|\|request_row\.(attribute|specialty)/)
  })

  it('mantém a rolagem concluída em recent_dice_rolls do snapshot', () => {
    expect(snapshotMigration).toContain("'recent_dice_rolls'")
    expect(snapshotMigration).toContain('from public.dice_rolls where campaign_id = target_campaign and is_test = false')
    expect(migration).toContain("coalesce((payload->>'is_test')::boolean,false)")
  })
})
