import { useCallback, useEffect, useState } from 'react'
import { ATTRIBUTE_NAMES } from '../game-data/classes'
import { cancelRollRequest, listPendingRollRequests, requestRoll, subscribeToRollRequests } from '../data/rolls'
import { supabase } from '../lib/supabase'
import type { Attributes, Character, RollRequest, Specialty } from '../types/database'
import { MechanicalButton, SectionTitle } from './RelicarioUI'

const SPECIALTIES: Specialty[] = ['Atletismo','Acrobacia','Furtividade','Investigação','Percepção','Sobrevivência','Medicina','Persuasão','Intimidação','História','Arcanismo','Performance','Rastreamento','Alquimia']

export function RollRequestPanel({ campaignId, characters, onError }: { campaignId: string; characters: Character[]; onError: (message: string) => void }) {
  const [requests, setRequests] = useState<RollRequest[]>([])
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? '')
  const [attribute, setAttribute] = useState<keyof Attributes | ''>('')
  const [specialty, setSpecialty] = useState<Specialty | ''>('')
  const [modifier, setModifier] = useState(0)
  const [difficulty, setDifficulty] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => void listPendingRollRequests(campaignId).then(setRequests), [campaignId])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const channel = subscribeToRollRequests(campaignId, refresh, 'admin')
    return () => { void supabase.removeChannel(channel) }
  }, [campaignId, refresh])

  async function submit() {
    if (!characterId || (!attribute && !specialty)) return
    setBusy(true)
    try {
      await requestRoll({ campaign_id: campaignId, character_id: characterId, attribute: attribute || undefined, specialty: specialty || undefined, modifier, difficulty: difficulty === '' ? undefined : difficulty, reason })
      setReason(''); setModifier(0); setDifficulty('')
      refresh()
    } catch (reason_) { onError(reason_ instanceof Error ? reason_.message : 'Não foi possível solicitar a rolagem.') }
    finally { setBusy(false) }
  }

  return (
    <section className="roll-request-panel" aria-label="Solicitar rolagem">
      <SectionTitle icon="teste-d20" title="Solicitar rolagem" description="Peça um teste a um dos personagens da mesa." />
      <form className="roll-request-form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
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
          <select value={specialty} onChange={(event) => setSpecialty(event.target.value as Specialty | '')}>
            <option value="">Nenhuma</option>
            {SPECIALTIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>Modificador<input type="number" min={-10} max={10} value={modifier} onChange={(event) => setModifier(Number(event.target.value))} /></label>
        <label>Dificuldade<input type="number" min={1} max={30} value={difficulty} onChange={(event) => setDifficulty(event.target.value === '' ? '' : Number(event.target.value))} /></label>
        <label className="wide">Motivo<input maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <MechanicalButton tone="primary" type="submit" disabled={busy || !characterId || (!attribute && !specialty)}>{busy ? 'Solicitando…' : 'Solicitar rolagem'}</MechanicalButton>
      </form>
      {requests.length ? (
        <ul className="roll-request-list">
          {requests.map((request) => {
            const character = characters.find((item) => item.id === request.requested_character_id)
            return <li key={request.id}>
              <span>{character?.name ?? 'Personagem'} deve fazer um teste{request.attribute ? ` de ${ATTRIBUTE_NAMES[request.attribute]}` : ''}{request.specialty ? ` + ${request.specialty}` : ''}.</span>
              <MechanicalButton onClick={() => void cancelRollRequest(request.id).then(refresh)}>Cancelar</MechanicalButton>
            </li>
          })}
        </ul>
      ) : <p className="compact-empty">Nenhuma solicitação pendente.</p>}
    </section>
  )
}
