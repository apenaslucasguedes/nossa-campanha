import type { ReactNode } from 'react'
import type { IconName } from '../assets/iconRegistry'
import { getClassDefinition } from '../game-data/classes'
import type { Character } from '../types/database'
import { CharacterPortrait } from './CharacterPortrait'
import { Icon } from './Icon'

export function CharacterCard({ character, playerName, action, headingId }: { character: Character; playerName?: string; action?: ReactNode; headingId?: string }) {
  const state = character.character_states
  const role = getClassDefinition(character.class_key)
  return (
    <article className="character-card" data-character-class={character.class_key}>
      <CharacterPortrait classKey={character.class_key} name={character.name} avatar={character.avatar} />
      <div className="character-card__body">
        <div className="card-heading">
          <div>
            <p className="character-card__level"><Icon name="nivel" size={17} decorative /> Nível {character.level}</p>
            <h2 id={headingId}>{character.name}</h2>
            <p className="character-card__class">{role.name}</p>
          </div>
          {playerName ? <span className="character-card__player">Jogador <strong>{playerName}</strong></span> : null}
        </div>
        {character.current_bond ? <p className="character-card__bond"><strong>Vínculo atual</strong> {character.current_bond}</p> : null}
        {state ? (
          <div className="resource-bars">
            <ResourceBar icon="vitalidade" label="Vitalidade" value={state.vitality_current} max={state.vitality_max} tone="vitality" />
            <ResourceBar icon="recurso-de-classe" label={role.resource} value={state.resource_current} max={state.resource_max} tone="resource" />
          </div>
        ) : <p className="muted">Estado mecânico ainda não configurado.</p>}
        <div className="condition-summary">
          <span><Icon name="condicao-generica" size={18} decorative /> Condições</span>
          {character.character_conditions.length ? <ul>{character.character_conditions.map((condition) => <ConditionBadge key={condition.id} name={condition.name} />)}</ul> : <p>Nenhuma condição ativa.</p>}
        </div>
        {action ? <div className="character-card__action">{action}</div> : null}
      </div>
    </article>
  )
}

export function ResourceBar({ icon, label, value, max, tone }: { icon: IconName; label: string; value: number; max: number; tone: 'vitality' | 'resource' }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, Math.round(value / max * 100))) : 0
  return (
    <div className={`resource-bar resource-bar--${tone}`}>
      <div className="resource-bar__label"><span><Icon name={icon} size={18} decorative /> {label}</span><strong>{value} / {max}</strong></div>
      <div className="resource-bar__track" aria-label={`${label}: ${value} de ${max}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><span style={{ width: `${percent}%` }} /></div>
    </div>
  )
}

export function ConditionBadge({ name }: { name: string }) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const known: Record<string, IconName> = { ferido: 'ferido', exausto: 'exausto', amedrontado: 'amedrontado', envenenado: 'envenenado', imobilizado: 'imobilizado', desorientado: 'desorientado' }
  return <li className="condition-badge"><Icon name={known[normalized] ?? 'condicao-generica'} size={16} decorative /> {name}</li>
}
