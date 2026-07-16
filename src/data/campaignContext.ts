import { ATTRIBUTE_KEYS, ATTRIBUTE_NAMES, getClassDefinition } from '../game-data/classes'
import { regions } from '../game-data/regions'
import type { CampaignDashboard } from './campaigns'

export const CAMPAIGN_CONTEXT_FORMAT_VERSION = '1.0'

const PRIVATE_PATTERNS = [/email/i, /token/i, /secret/i, /service[_-]?role/i, /credential/i, /supabase/i, /auth/i]

function line(value: string | null | undefined, fallback = 'Nao registrado') {
  const clean = value?.trim()
  return clean || fallback
}

function list(values: readonly string[] | null | undefined) {
  const clean = (values ?? []).map((value) => value.trim()).filter(Boolean)
  return clean.length ? clean.map((value) => `- ${value}`).join('\n') : '- Nenhum registro.'
}

function sanitizeFilename(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase() || 'CAMPANHA'
}

export function campaignMarkdownFilename(name: string) {
  return `RELICARIO_CAMPAIGN_${sanitizeFilename(name)}.md`
}

export function assertNoPrivateCampaignContext(markdown: string) {
  if (PRIVATE_PATTERNS.some((pattern) => pattern.test(markdown))) throw new Error('O pacote contem uma chave privada ou dado interno.')
}

export function buildCampaignMarkdown(data: CampaignDashboard) {
  const campaign = data.campaign
  const region = campaign.current_region_id ? regions[campaign.current_region_id] : null
  const locations = data.locations.filter((location) => location.revealed)
  const seats = [1, 2].map((seat) => {
    const member = data.members.find((item) => item.seat === seat)
    const character = data.characters.find((item) => item.owner_id === member?.user_id)
    if (!character) return `### Assento ${seat}\n\n- Estado: vazio`
    const role = getClassDefinition(character.class_key)
    const state = character.character_states
    const conditions = character.character_conditions.map((condition) => condition.name)
    const specialties = character.character_specialties.map((specialty) => `${specialty.name} (${specialty.source})`)
    const attributes = ATTRIBUTE_KEYS.map((key) => `- ${ATTRIBUTE_NAMES[key]}: ${character.attributes[key]}`).join('\n')
    return [
      `### Assento ${seat}: ${character.name}`,
      '',
      `- Classe: ${role.name}`,
      `- Nivel: ${character.level}`,
      `- Jogador: ${member?.profile?.display_name ?? 'Nao informado'}`,
      `- Estado de vinculo: ${member ? 'vinculado' : 'sem participante'}`,
      `- Vitalidade: ${state ? `${state.vitality_current}/${state.vitality_max}` : 'Nao configurada'}`,
      `- Defesa: ${character.defense}`,
      `- Recurso de classe (${role.resource}): ${state ? `${state.resource_current}/${state.resource_max}` : 'Nao configurado'}`,
      `- Inventario relevante: capacidade ${character.inventory_capacity}; itens detalhados nao registrados nesta etapa.`,
      `- Vinculo inicial: ${line(character.initial_bond)}`,
      `- Vinculo atual: ${line(character.current_bond)}`,
      '',
      '#### Atributos',
      attributes,
      '',
      '#### Especialidades',
      list(specialties),
      '',
      '#### Habilidades',
      `- Basica: ${role.basicAbility}`,
      `- Inicial: ${role.initialAbility}`,
      '',
      '#### Condicoes',
      list(conditions),
    ].join('\n')
  })
  const markdown = [
    '# Pacote de contexto do Relicario',
    '',
    `- Versao do formato: ${CAMPAIGN_CONTEXT_FORMAT_VERSION}`,
    `- ID da campanha: ${campaign.id}`,
    `- Nome: ${campaign.name}`,
    `- Status: ${line(campaign.status)}`,
    `- Criada em: ${campaign.created_at ? new Date(campaign.created_at).toISOString().slice(0, 10) : 'Nao disponivel'}`,
    '',
    '## Identidade da campanha',
    '',
    `**Premissa:** ${line(campaign.premise)}`,
    '',
    `**Resumo atual:** ${line(campaign.current_summary)}`,
    '',
    `**Regiao atual:** ${region ? `${region.name} - ${region.description}` : 'Nao definida'}`,
    '',
    '## Locais revelados',
    '',
    locations.length
      ? locations.map((location) => `- ${location.name} (${regions[location.region_id].name}${location.kind ? `, ${location.kind}` : ''})`).join('\n')
      : '- Nenhum local revelado.',
    '',
    '## Estado da campanha',
    '',
    '### Resumo da ultima sessao',
    '',
    line(campaign.last_session_summary),
    '',
    '### Objetivos ativos',
    '',
    list(campaign.active_objectives),
    '',
    '### Anotacoes importantes',
    '',
    line(campaign.important_notes),
    '',
    '## Protagonistas',
    '',
    seats.join('\n\n'),
    '',
    '## Estado mecanico para continuidade',
    '',
    'Use os valores acima como referencia mecanica atual. Alteracoes de Vitalidade, recursos e condicoes devem continuar sendo feitas pela Ficha ou pela Mesa.',
    '',
  ].join('\n')
  assertNoPrivateCampaignContext(markdown)
  return markdown
}

export function downloadCampaignMarkdown(data: CampaignDashboard) {
  const markdown = buildCampaignMarkdown(data)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = campaignMarkdownFilename(data.campaign.name)
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function copyCampaignMarkdown(data: CampaignDashboard) {
  await navigator.clipboard.writeText(buildCampaignMarkdown(data))
}
