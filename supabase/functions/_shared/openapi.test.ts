import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'docs/gpt-actions/openapi.yaml'), 'utf8')
const yaml = createRequire(import.meta.url)('js-yaml') as { load(value: string): unknown }
const actions = ['apply_damage','apply_healing','spend_resource','restore_resource','add_condition','remove_condition','start_combat','end_combat','advance_turn','advance_round','create_enemy','update_enemy','defeat_enemy']
const errors = ['UNAUTHENTICATED','FORBIDDEN','CAMPAIGN_NOT_FOUND','INVALID_ACTION','INVALID_TARGET','LIMIT_EXCEEDED','CONFLICT','MIGRATION_REQUIRED']

describe('OpenAPI das GPT Actions', () => {
  it('é YAML estruturalmente válido e OpenAPI 3.1', () => {
    expect(() => yaml.load(source)).not.toThrow()
    expect(source).toMatch(/^openapi: 3\.1\.0$/m)
    expect(source).toMatch(/^info:\s*$/m)
    expect(source).toMatch(/^paths:\s*$/m)
    expect(source).toMatch(/^components:\s*$/m)
    expect(source).not.toMatch(/\t/)
    expect(source).not.toMatch(/^\s*[^#\s][^:]*\s+[^:]+$/m)
  })

  it('expõe exatamente os quatro endpoints e operationIds únicos', () => {
    const paths = [...source.matchAll(/^ {2}\/([^:]+):$/gm)].map(match => match[1])
    expect(paths).toEqual(['campaign-state','table-state','world-state','apply-game-action'])
    const ids = [...source.matchAll(/^ {6}operationId: (\S+)$/gm)].map(match => match[1])
    expect(ids).toEqual(['getCampaignState','getTableState','getWorldState','applyGameAction'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mantém referências locais resolvíveis', () => {
    const schemas = new Set([...source.matchAll(/^ {4}([A-Za-z][A-Za-z0-9]+):/gm)].map(match => match[1]))
    const refs = [...source.matchAll(/#\/components\/schemas\/([A-Za-z][A-Za-z0-9]+)/g)].map(match => match[1])
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) expect(schemas.has(ref), `schema ausente: ${ref}`).toBe(true)
  })

  it('documenta somente a união fechada implementada', () => {
    for (const action of actions) expect(source).toContain(`          ${action}: '#/components/schemas/`)
    expect(source).not.toMatch(/reveal_location/i)
    expect(source).not.toMatch(/execute_sql/i)
  })

  it('exige request_id na escrita e documenta todos os erros estáveis', () => {
    expect(source).toContain('required: [campaign_id, request_id, action]')
    for (const error of errors) expect(source).toContain(error)
  })

  it('não contém credenciais nem autenticação administrativa', () => {
    expect(source).toContain('Authorization: Bearer <JWT>')
    expect(source).toContain('SEU_PROJECT_REF')
    expect(source).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/)
    expect(source).not.toMatch(/sb_secret_[A-Za-z0-9_-]+/)
    expect(source).not.toMatch(/service_role/i)
  })
})
