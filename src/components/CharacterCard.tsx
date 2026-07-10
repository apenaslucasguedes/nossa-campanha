import type { Character } from '../types/database'
export function CharacterCard({ character, compact = false }: { character: Character; compact?: boolean }) {
  const state = character.character_states
  return <article className="character-card"><div className="card-heading"><div><p className="eyebrow">Nível {character.level}</p><h2>{character.name}</h2></div><span className="class-mark">{character.class_key.replace('_', ' ')}</span></div>
    {state ? <div className="meters"><Meter label="Vitalidade" value={state.vitality_current} max={state.vitality_max}/><Meter label="Recurso" value={state.resource_current} max={state.resource_max}/></div> : <p className="muted">Estado mecânico ainda não configurado.</p>}
    {!compact ? <div className="conditions"><span>Condições</span>{character.character_conditions.length ? <ul>{character.character_conditions.map(c => <li key={c.id}>{c.name}</li>)}</ul> : <p>Nenhuma condição ativa.</p>}</div> : null}
  </article>
}
function Meter({ label, value, max }: { label: string; value: number; max: number }) { const percent = max > 0 ? Math.round(value / max * 100) : 0; return <div className="meter"><div><span>{label}</span><strong>{value} / {max}</strong></div><div className="meter-track" aria-label={`${label}: ${value} de ${max}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><span style={{ width: `${percent}%` }}/></div></div> }
