import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'docs/gpt-actions/openapi.yaml'), 'utf8')
const yaml = createRequire(import.meta.url)('js-yaml') as { load(value: string): unknown }
const errors = ['UNAUTHENTICATED','FORBIDDEN','CAMPAIGN_NOT_FOUND','INVALID_ACTION','INVALID_TARGET','LIMIT_EXCEEDED','CONFLICT','MIGRATION_REQUIRED']

describe('OpenAPI das GPT Actions (fase 1)', () => {
  it('é YAML estruturalmente válido e OpenAPI 3.1', () => {
    expect(() => yaml.load(source)).not.toThrow()
    expect(source).toMatch(/^openapi: 3\.1\.0$/m)
    expect(source).toMatch(/^info:\s*$/m)
    expect(source).toMatch(/^paths:\s*$/m)
    expect(source).toMatch(/^components:\s*$/m)
    expect(source).not.toMatch(/\t/)
    expect(source).not.toMatch(/^\s*[^#\s][^:]*\s+[^:]+$/m)
  })

  it('expõe exatamente os dois endpoints da fase 1, com operationIds únicos', () => {
    const paths = [...source.matchAll(/^ {2}\/([^:]+):$/gm)].map(match => match[1])
    expect(paths).toEqual(['campaign-snapshot', 'request-dice-roll'])
    const ids = [...source.matchAll(/^ {6}operationId: (\S+)$/gm)].map(match => match[1])
    expect(ids).toEqual(['getCampaignSnapshot', 'requestDiceRoll'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('não expõe applyGameAction nem os endpoints legados nesta fase', () => {
    expect(source).not.toMatch(/applyGameAction/)
    expect(source).not.toMatch(/getCampaignState|getTableState|getWorldState/)
    expect(source).not.toMatch(/\/campaign-state|\/table-state|\/world-state|\/apply-game-action/)
  })

  it('mantém referências locais resolvíveis', () => {
    const schemas = new Set([...source.matchAll(/^ {4}([A-Za-z][A-Za-z0-9]+):/gm)].map(match => match[1]))
    const refs = [...source.matchAll(/#\/components\/schemas\/([A-Za-z][A-Za-z0-9]+)/g)].map(match => match[1])
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) expect(schemas.has(ref), `schema ausente: ${ref}`).toBe(true)
  })

  it('autentica por chave de campanha via cabeçalho customizado, documenta todos os erros estáveis e exige character_id', () => {
    expect(source).toContain('type: apiKey')
    expect(source).toContain('in: header')
    expect(source).toContain('name: X-Relicario-Key')
    expect(source).toContain('- relicarioGptKey: []')
    expect(source).toContain('required: [character_id]')
    for (const error of errors) expect(source).toContain(error)
  })

  it('não contém credenciais reais nem sugere anon key, service_role, senha ou JWT fixo como valor da chave', () => {
    expect(source).not.toContain('SEU_PROJECT_REF')
    expect(source).toContain('https://advdjsleblaosiagmrny.supabase.co/functions/v1')
    expect(source).toMatch(/Nunca use a anon key.*service_role.*JWT de usuário fixo ou uma senha/)
    expect(source).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/)
    expect(source).not.toMatch(/sb_secret_[A-Za-z0-9_-]+/)
    expect(source).not.toMatch(/Authorization: Bearer/)
  })

  it('não tem nenhuma description acima de 300 caracteres', () => {
    const descriptions = [...source.matchAll(/description:\s*(.+)/g)].map(match =>
      match[1].trim().replace(/^['"]|['"]$/g, ''),
    )
    expect(descriptions.length).toBeGreaterThan(0)
    for (const description of descriptions) expect(description.length).toBeLessThanOrEqual(300)
  })

  it('não tem nenhum schema do tipo object sem properties', () => {
    const doc = yaml.load(source) as Record<string, unknown>
    const offenders: string[] = []
    const walk = (node: unknown, path: string) => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${path}[${index}]`))
        return
      }
      if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>
        if (obj.type === 'object' && !('properties' in obj)) offenders.push(path)
        for (const key of Object.keys(obj)) walk(obj[key], `${path}.${key}`)
      }
    }
    walk(doc, 'root')
    expect(offenders).toEqual([])
  })

  it('não referencia mais o schema EmptyRequest', () => {
    expect(source).not.toMatch(/EmptyRequest/)
  })

  it('marca as duas operações como não consequenciais e não introduz nenhuma operação consequencial', () => {
    const doc = yaml.load(source) as {
      paths: Record<string, { post: Record<string, unknown> }>
    }
    expect(doc.paths['/campaign-snapshot'].post['x-openai-isConsequential']).toBe(false)
    expect(doc.paths['/request-dice-roll'].post['x-openai-isConsequential']).toBe(false)
    const flags = [...source.matchAll(/^\s*x-openai-isConsequential:\s*(\S+)/gm)].map(match => match[1])
    expect(flags).toEqual(['false', 'false'])
  })

  it('campaign-snapshot não tem requestBody e request-dice-roll tem requestBody do tipo object', () => {
    const doc = yaml.load(source) as {
      paths: Record<string, { post: { requestBody?: { content: Record<string, { schema: unknown }> } } }>
      components: { schemas: Record<string, { type?: string }> }
    }
    expect(doc.paths['/campaign-snapshot'].post.requestBody).toBeUndefined()
    const diceRollBody = doc.paths['/request-dice-roll'].post.requestBody
    expect(diceRollBody).toBeDefined()
    const schema = diceRollBody!.content['application/json'].schema as { $ref?: string }
    expect(schema.$ref).toBe('#/components/schemas/RequestDiceRollRequest')
    expect(doc.components.schemas.RequestDiceRollRequest.type).toBe('object')
  })
})
