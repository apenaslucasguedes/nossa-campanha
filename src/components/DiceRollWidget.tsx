import { useEffect, useState } from 'react'
import { ATTRIBUTE_NAMES } from '../game-data/classes'
import { listPendingRollRequests, performDiceRoll, subscribeToRollRequests, type PerformRollResult } from '../data/rolls'
import { supabase } from '../lib/supabase'
import type { Character, DiceKind, RollRequest } from '../types/database'
import { MechanicalButton, SectionTitle } from './RelicarioUI'

const DICE_OPTIONS: DiceKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

function testLabel(request: RollRequest) {
  const parts = [request.attribute ? ATTRIBUTE_NAMES[request.attribute] : null, request.specialty].filter(Boolean)
  return parts.join(' + ')
}

/**
 * Rolador do jogador. Quando existe um teste pendente para o personagem do
 * usuário, a rolagem vinculada é a ação principal: todos os campos já vêm da
 * solicitação (dado d20, atributo, especialidade, dificuldade, motivo e
 * modificador), e o jogador só precisa clicar em "Rolar teste". A rolagem
 * livre continua disponível, porém recolhida.
 */
export function DiceRollWidget({ campaignId, ownCharacter, characters, onResult, onError }: { campaignId: string; ownCharacter: Character | null; characters: Character[]; onResult: (result: PerformRollResult) => void; onError: (message: string) => void }) {
  const [pending, setPending] = useState<RollRequest[]>([])
  const [rolling, setRolling] = useState(false)
  const [dice, setDice] = useState<DiceKind>('d20')
  const [count, setCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [isTest, setIsTest] = useState(false)
  const [label, setLabel] = useState('')

  useEffect(() => {
    const refresh = () => void listPendingRollRequests(campaignId).then(setPending)
    refresh()
    const channel = subscribeToRollRequests(campaignId, refresh, 'player')
    return () => { void supabase.removeChannel(channel) }
  }, [campaignId])

  const myRequest = ownCharacter ? pending.find((request) => request.requested_character_id === ownCharacter.id) : undefined
  const othersRequests = pending.filter((request) => request.requested_character_id !== ownCharacter?.id)

  function characterName(id: string) { return characters.find((item) => item.id === id)?.name ?? 'outro personagem' }

  async function roll(input: { roll_request_id?: string; dice: DiceKind; count?: number; modifier?: number; is_test?: boolean; label?: string }) {
    setRolling(true)
    try {
      const result = await performDiceRoll({ campaign_id: campaignId, ...input })
      onResult(result)
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Não foi possível rolar os dados.') }
    finally { setRolling(false) }
  }

  return (
    <section className="dice-roll-widget" aria-label="Rolagem de dados">
      <SectionTitle icon="teste-d20" title="Seus dados" description={ownCharacter ? `Rolagens de ${ownCharacter.name} são registradas automaticamente.` : 'Você precisa de um personagem nesta campanha para rolar.'} />

      {myRequest ? (
        <div className="dice-roll-widget__pending" aria-label="Teste pendente">
          <p className="dice-roll-widget__pending-test">
            <strong>{ownCharacter?.name}</strong>{testLabel(myRequest) ? ` — ${testLabel(myRequest)}` : ''}{myRequest.difficulty != null ? `, dificuldade ${myRequest.difficulty}` : ''}
          </p>
          {myRequest.reason ? <p className="dice-roll-widget__pending-reason">{myRequest.reason}</p> : null}
          <p className="dice-roll-widget__pending-meta">Dado d20 · Modificador {myRequest.modifier >= 0 ? `+${myRequest.modifier}` : myRequest.modifier}</p>
          <MechanicalButton tone="primary" icon="teste-d20" disabled={rolling} onClick={() => void roll({ roll_request_id: myRequest.id, dice: 'd20', count: 1, modifier: myRequest.modifier })}>{rolling ? 'Rolando…' : 'Rolar teste'}</MechanicalButton>
        </div>
      ) : null}

      {othersRequests.map((request) => (
        <p key={request.id} className="dice-roll-widget__waiting">Aguardando a rolagem de {characterName(request.requested_character_id)}.</p>
      ))}

      <details className="dice-roll-widget__free-details">
        <summary>Rolagem livre registrada</summary>
        <form className="dice-roll-widget__free" onSubmit={(event) => { event.preventDefault(); if (ownCharacter) void roll({ dice, count, modifier, is_test: isTest, label }) }}>
          <label>Dado<select value={dice} onChange={(event) => setDice(event.target.value as DiceKind)}>{DICE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Quantidade<input type="number" min={1} max={4} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
          <label>Modificador<input type="number" min={-10} max={10} value={modifier} onChange={(event) => setModifier(Number(event.target.value))} /></label>
          <label>Rótulo<input maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} /></label>
          <label><input type="checkbox" checked={isTest} onChange={(event) => setIsTest(event.target.checked)} /> Marcar como teste</label>
          <MechanicalButton type="submit" disabled={rolling || !ownCharacter}>{rolling ? 'Rolando…' : 'Rolar'}</MechanicalButton>
        </form>
      </details>
    </section>
  )
}
