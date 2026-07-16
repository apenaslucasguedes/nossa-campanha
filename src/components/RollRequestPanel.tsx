import { useEffect, useMemo, useState } from 'react'
import { ATTRIBUTE_NAMES } from '../game-data/classes'
import { requestRoll } from '../data/rolls'
import type { Attributes, Character, Specialty } from '../types/database'
import { MechanicalButton } from './RelicarioUI'

/**
 * Botão compacto "Solicitar teste" que abre um painel pequeno. Os campos usam
 * apenas dados que já existem: personagens reais da campanha, os cinco
 * atributos e as especialidades reais do personagem selecionado. Não há texto
 * livre para atributo ou especialidade.
 */
export function RollRequestPanel({ campaignId, characters, onError, onRequested }: { campaignId: string; characters: Character[]; onError: (message: string) => void; onRequested: (message: string) => void }) {
  const [open, setOpen] = useState(false)
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? '')
  const [attribute, setAttribute] = useState<keyof Attributes | ''>('')
  const [specialty, setSpecialty] = useState<Specialty | ''>('')
  const [difficulty, setDifficulty] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const selected = characters.find((item) => item.id === characterId) ?? characters[0] ?? null
  const specialties = useMemo(() => (selected?.character_specialties ?? []).map((item) => item.name), [selected])

  // A especialidade escolhida precisa pertencer ao personagem selecionado.
  useEffect(() => { if (specialty && !specialties.includes(specialty)) setSpecialty('') }, [specialties, specialty])

  function reset() {
    setAttribute(''); setSpecialty(''); setDifficulty(''); setReason('')
  }

  async function submit() {
    if (!characterId || (!attribute && !specialty)) return
    setBusy(true)
    try {
      await requestRoll({ campaign_id: campaignId, character_id: characterId, attribute: attribute || undefined, specialty: specialty || undefined, difficulty: difficulty === '' ? undefined : difficulty, reason })
      const name = characters.find((item) => item.id === characterId)?.name ?? 'personagem'
      reset(); setOpen(false)
      onRequested(`Teste solicitado a ${name}.`)
    } catch (reason_) { onError(reason_ instanceof Error ? reason_.message : 'Não foi possível solicitar a rolagem.') }
    finally { setBusy(false) }
  }

  if (!characters.length) return null

  return (
    <div className="roll-request">
      <MechanicalButton icon="teste-d20" onClick={() => setOpen(true)}>Solicitar teste</MechanicalButton>
      {open ? (
        <div className="roll-request__backdrop" role="dialog" aria-modal="true" aria-label="Solicitar teste" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <form className="roll-request__panel" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <h3>Solicitar teste</h3>
            <label>Personagem
              <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            </label>
            <label>Atributo
              <select value={attribute} onChange={(event) => setAttribute(event.target.value as keyof Attributes | '')}>
                <option value="">Nenhum</option>
                {Object.entries(ATTRIBUTE_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>Especialidade
              <select value={specialty} onChange={(event) => setSpecialty(event.target.value as Specialty | '')} disabled={!specialties.length}>
                <option value="">Nenhuma</option>
                {specialties.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Dificuldade<input type="number" min={1} max={30} value={difficulty} onChange={(event) => setDifficulty(event.target.value === '' ? '' : Number(event.target.value))} /></label>
            <label>Motivo<input maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <div className="roll-request__actions">
              <MechanicalButton tone="primary" type="submit" disabled={busy || !characterId || (!attribute && !specialty)}>{busy ? 'Solicitando…' : 'Solicitar'}</MechanicalButton>
              <MechanicalButton type="button" onClick={() => setOpen(false)}>Cancelar</MechanicalButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
