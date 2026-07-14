import type { ReactNode } from 'react'
import type { IconName } from '../assets/iconRegistry'
import { ATTRIBUTE_KEYS, ATTRIBUTE_NAMES, getClassDefinition } from '../game-data/classes'
import type { Attributes, ClassKey, Specialty } from '../types/database'
import { CharacterPortrait } from './CharacterPortrait'
import { ConditionBadge, ResourceBar } from './CharacterCard'
import { EditableCharacterArtwork } from './EditableCharacterArtwork'
import { Icon } from './Icon'

const ATTRIBUTE_META: Record<keyof Attributes, { icon: IconName; description: string }> = {
  strength: { icon: 'forca', description: 'Potência física, carga e impacto.' },
  agility: { icon: 'agilidade', description: 'Reflexos, precisão e movimento.' },
  intellect: { icon: 'intelecto', description: 'Raciocínio, estudo e magia.' },
  presence: { icon: 'presenca', description: 'Influência, expressão e liderança.' },
  instinct: { icon: 'instinto', description: 'Percepção, resistência e intuição.' },
}

const SPECIALTY_DESCRIPTIONS: Record<Specialty, string> = {
  Atletismo: 'Ações de força, corrida, escalada e esforço físico.',
  Acrobacia: 'Equilíbrio, quedas, saltos e manobras corporais.',
  Furtividade: 'Mover-se e agir sem chamar atenção.',
  Investigação: 'Encontrar pistas e interpretar evidências.',
  Percepção: 'Notar ameaças, detalhes e mudanças no ambiente.',
  Sobrevivência: 'Orientação, abrigo e resistência em regiões hostis.',
  Medicina: 'Avaliar ferimentos e prestar cuidados.',
  Persuasão: 'Convencer por diálogo, confiança e argumento.',
  Intimidação: 'Pressionar alguém por presença ou ameaça.',
  História: 'Recordar povos, eventos, lugares e tradições.',
  Arcanismo: 'Reconhecer fenômenos, rituais e forças mágicas.',
  Performance: 'Mobilizar uma audiência com arte e expressão.',
  Rastreamento: 'Seguir sinais, trilhas e movimentos recentes.',
  Alquimia: 'Identificar e preparar compostos e reagentes.',
}

function classIcon(classKey: ClassKey): IconName {
  return ({ warrior: 'guerreiro', arcanist: 'arcanista', shadow_blade: 'lamina-sombria', necromancer: 'necromante', bard: 'bardo', druid: 'druida' } as const)[classKey]
}

export function CreationStepHeader({ step, title, children }: { step: number; title: string; children?: ReactNode }) {
  const icons: IconName[] = ['personagens', 'teste-d20', 'diario', 'amuleto', 'habilidades', 'personagens', 'exportar-para-gpt']
  return <header className="creation-step-header"><span className="creation-step-header__icon"><Icon name={icons[step]} size={34} decorative /></span><div><p>Etapa {step + 1} de 7</p><h2 id="stage-title">{title}</h2>{children ? <div className="creation-step-header__help">{children}</div> : null}</div></header>
}

export function AttributeItem({ attribute, value, control }: { attribute: keyof Attributes; value: number; control?: ReactNode }) {
  const meta = ATTRIBUTE_META[attribute]
  return <div className="attribute-item"><div className="attribute-item__heading"><Icon name={meta.icon} size={25} decorative /><span>{ATTRIBUTE_NAMES[attribute]}</span><strong>{value}</strong></div>{control ? <div className="attribute-item__control">{control}</div> : null}<p>{meta.description}</p></div>
}

export function AbilityCard({ label, ability }: { label: string; ability: string }) {
  const [name, ...effect] = ability.split(' — ')
  return <article className="ability-card"><span><Icon name="habilidades" size={19} decorative />{label}</span><h4>{name}</h4>{effect.length ? <p>{effect.join(' — ')}</p> : null}</article>
}

export function SpecialtyCard({ name, suggested = false, level, selected, control }: { name: Specialty; suggested?: boolean; level?: string; selected?: boolean; control?: ReactNode }) {
  return <article className={`specialty-card ${suggested ? 'is-suggested' : ''} ${selected ? 'is-selected' : ''}`.trim()}><div className="specialty-card__heading"><strong>{name}</strong>{suggested ? <small>Sugestão da classe</small> : null}{level ? <small>{level}</small> : null}</div><p>{SPECIALTY_DESCRIPTIONS[name]}</p>{control}</article>
}

export function CharacterHeader({ classKey, name, level, playerName, presentation, origin, currentBond, edit, remove, removing, portrait }: { classKey: ClassKey; name: string; level: number; playerName?: string; presentation: string; origin: string; currentBond?: string; edit?: () => void; remove?: () => void; removing?: boolean; portrait?: ReactNode }) {
  const role = getClassDefinition(classKey)
  return <header className="character-header" data-character-class={classKey}>{portrait ?? <CharacterPortrait classKey={classKey} name={name} />}<div className="character-header__content"><p className="character-header__level"><Icon name="nivel" size={18} decorative /> Nível {level}</p><h2>{name}</h2><p className="character-header__class"><Icon name={classIcon(classKey)} size={24} decorative /><strong>{role.name}</strong><span>{role.role}</span></p><dl className="character-header__facts"><div><dt>Apresentação</dt><dd>{presentation}</dd></div><div><dt>Origem</dt><dd>{origin}</dd></div>{playerName ? <div><dt>Jogador</dt><dd>{playerName}</dd></div> : null}{currentBond ? <div><dt>Vínculo atual</dt><dd>{currentBond}</dd></div> : null}</dl><div className="character-header__actions">{edit ? <button className="character-header__edit" type="button" onClick={edit}>Editar ficha</button> : null}{remove ? <button className="character-header__delete danger-button" type="button" disabled={removing} onClick={remove}>{removing ? 'Apagando…' : 'Apagar personagem'}</button> : null}</div></div></header>
}

export function CharacterSummary({ vitality, resource, resourceLabel, defense, inventoryCapacity, conditions }: { vitality?: { current: number; max: number }; resource?: { current: number; max: number }; resourceLabel: string; defense: number; inventoryCapacity?: number; conditions: { id: string; name: string }[] }) {
  return <section className="character-summary" aria-labelledby="mechanical-summary-title"><div className="section-heading"><Icon name="teste-d20" size={23} decorative /><div><h3 id="mechanical-summary-title">Resumo mecânico</h3><p>Estado atual do personagem</p></div></div><div className="character-summary__grid"><div className="character-summary__bars">{vitality ? <ResourceBar icon="vitalidade" label="Vitalidade" value={vitality.current} max={vitality.max} tone="vitality" /> : <p className="muted">Vitalidade ainda não configurada.</p>}{resource ? <ResourceBar icon="recurso-de-classe" label={resourceLabel} value={resource.current} max={resource.max} tone="resource" /> : <p className="muted">Recurso ainda não configurado.</p>}</div><dl className="mechanic-readout"><div><dt><Icon name="defesa" size={18} decorative />Defesa</dt><dd>{defense}</dd></div>{inventoryCapacity !== undefined ? <div><dt><Icon name="inventario" size={18} decorative />Inventário</dt><dd>{inventoryCapacity}</dd></div> : null}</dl></div><div className="active-conditions"><span><Icon name="condicao-generica" size={18} decorative /> Condições ativas</span>{conditions.length ? <ul>{conditions.map((condition) => <ConditionBadge key={condition.id} name={condition.name} />)}</ul> : <p>Nenhuma condição ativa.</p>}</div></section>
}

export function NarrativeSection({ entries }: { entries: { label: string; value: string }[] }) {
  return <section className="narrative-section"><div className="section-heading"><Icon name="diario" size={23} decorative /><div><h3>História</h3><p>Identidade, motivações e vínculos</p></div></div><dl>{entries.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl></section>
}

export function CharacterReview({ input, colors, derived }: { input: { name: string; presentation: string; origin: string; appearance: string; personality: string; objective: string; fear: string; bond: string; classKey: ClassKey; attributes: Attributes; specialties: Specialty[] }; colors?: Record<string, string>; derived: { vitality: number; defense: number; inventoryCapacity: number; resource: number } }) {
  const role = getClassDefinition(input.classKey)
  const portrait = colors ? <EditableCharacterArtwork classKey={input.classKey} colors={colors} /> : undefined
  return <div className="character-review"><CharacterHeader classKey={input.classKey} name={input.name} level={1} presentation={input.presentation} origin={input.origin} currentBond={input.bond} portrait={portrait} /><div className="character-review__body"><dl className="mechanic-readout"><div><dt><Icon name="vitalidade" size={18} decorative />Vitalidade</dt><dd>{derived.vitality}</dd></div><div><dt><Icon name="recurso-de-classe" size={18} decorative />{role.resource}</dt><dd>{derived.resource}</dd></div><div><dt><Icon name="defesa" size={18} decorative />Defesa</dt><dd>{derived.defense}</dd></div><div><dt><Icon name="inventario" size={18} decorative />Inventário</dt><dd>{derived.inventoryCapacity}</dd></div></dl><section><h3>Atributos</h3><div className="attribute-readout">{ATTRIBUTE_KEYS.map((key) => <AttributeItem key={key} attribute={key} value={input.attributes[key]} />)}</div></section><section><h3>Especialidades</h3><div className="specialty-review">{input.specialties.map((item) => <SpecialtyCard key={item} name={item} />)}</div></section><section className="ability-grid"><AbilityCard label="Habilidade básica" ability={role.basicAbility} /><AbilityCard label="Habilidade inicial" ability={role.initialAbility} /></section><NarrativeSection entries={[{ label: 'Aparência', value: input.appearance }, { label: 'Personalidade', value: input.personality }, { label: 'Objetivo', value: input.objective }, { label: 'Medo', value: input.fear }, { label: 'Vínculo', value: input.bond }]} /><p className="creation-confirmation"><Icon name="personagens" size={22} decorative /><span><strong>Esta confirmação cria o personagem real.</strong> A ficha será gravada na campanha somente ao acionar “Criar meu personagem”.</span></p></div></div>
}
