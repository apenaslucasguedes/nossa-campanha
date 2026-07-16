import { useEffect, useRef, useState } from 'react'
import { ATTRIBUTE_NAMES } from '../game-data/classes'
import { listPendingRollRequests, performDiceRoll, subscribeToRollRequests, type PerformRollResult } from '../data/rolls'
import { supabase } from '../lib/supabase'
import type { Character, DiceKind, RollRequest } from '../types/database'
import { MechanicalButton, SectionTitle } from './RelicarioUI'

const DICE_OPTIONS: DiceKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']
const ROLL_ANIMATION_MS = 850

function testLabel(request: RollRequest) {
  const parts = [request.attribute ? ATTRIBUTE_NAMES[request.attribute] : null, request.specialty].filter(Boolean)
  return parts.join(' + ')
}

function formatModifier(modifier: number) { return modifier >= 0 ? `+${modifier}` : String(modifier) }

function outcomeLabel(outcome: string | null | undefined) {
  if (!outcome) return null
  if (outcome.includes('success')) return 'Sucesso'
  if (outcome.includes('failure')) return 'Falha'
  return null
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function wait(ms: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, ms)) }

function DiceTray({ dice, count, rolling, result }: { dice: DiceKind; count: number; rolling: boolean; result: PerformRollResult | null }) {
  const displayed = Array.from({ length: Math.min(count, 12) }, (_, index) => ({ value: result?.results?.[index], index }))
  const verdict = outcomeLabel(result?.outcome)
  return (
    <div className={`dice-tray dice-roll-widget__tray${rolling ? ' is-rolling' : ''}${result ? ' has-result' : ''}`} aria-busy={rolling} data-reduced-motion={prefersReducedMotion() ? 'true' : 'false'}>
      <div className="dice-tray__heading"><span>Bandeja de rolagem</span><strong>{result ? `Total ${result.total}` : `${count} dado(s)`}</strong></div>
      <div className="dice-tray__surface">
        {displayed.map(({ value, index }) => (
          <span className={`die-token die-token--${dice}${value == null ? ' die-token--idle' : ''}`} key={`${dice}-${index}`}>
            <small>{dice}</small>{value != null ? <b>{value}</b> : null}
          </span>
        ))}
      </div>
      <output className="dice-tray__result" aria-live="polite">
        {rolling ? <span>Rolando…</span> : result ? <><span>{result.results?.join(' · ') || `${result.count}${result.dice}`}{result.modifier ? ` ${formatModifier(result.modifier)}` : ''}</span><em className={verdict ? `is-${verdict.toLowerCase()}` : ''}>{verdict ? `${verdict} · ` : ''}Total {result.total}</em></> : <span>Monte o conjunto e faça sua rolagem.</span>}
      </output>
    </div>
  )
}

function DicePicker({ dice, count, disabled, onChange }: { dice: DiceKind; count: number; disabled: boolean; onChange: (dice: DiceKind, count: number) => void }) {
  return (
    <div className="dice-picker dice-roll-widget__picker" aria-label="Escolher dado">
      {DICE_OPTIONS.map((option) => (
        <span className={`dice-choice${dice === option ? ' is-selected' : ''}`} key={option}>
          <button type="button" className={`dice-choice__add die-token--${option}`} aria-label={`Selecionar ${option}`} aria-pressed={dice === option} disabled={disabled} onClick={() => onChange(option, dice === option ? Math.min(4, count + 1) : 1)}>
            <span>{option}</span>
          </button>
          {dice === option ? <b className="dice-choice__count" aria-label={`Quantidade ${count}`}>{count}</b> : null}
        </span>
      ))}
    </div>
  )
}

export function DiceRollWidget({ campaignId, ownCharacter, characters, onResult, onError }: { campaignId: string; ownCharacter: Character | null; characters: Character[]; onResult: (result: PerformRollResult) => void; onError: (message: string) => void }) {
  const [pending, setPending] = useState<RollRequest[]>([])
  const [rolling, setRolling] = useState(false)
  const rollingRef = useRef(false)
  const [dice, setDice] = useState<DiceKind>('d20')
  const [count, setCount] = useState(1)
  const [modifier, setModifier] = useState(0)
  const [isTest, setIsTest] = useState(false)
  const [label, setLabel] = useState('')
  const [result, setResult] = useState<PerformRollResult | null>(null)
  const [resultTarget, setResultTarget] = useState<'pending' | 'free' | null>(null)
  const [activeRequest, setActiveRequest] = useState<RollRequest | null>(null)
  const resultTimer = useRef<number | null>(null)

  useEffect(() => {
    const refresh = () => void listPendingRollRequests(campaignId).then(setPending)
    refresh()
    const channel = subscribeToRollRequests(campaignId, refresh, 'player')
    return () => { void supabase.removeChannel(channel) }
  }, [campaignId])

  useEffect(() => () => { if (resultTimer.current !== null) window.clearTimeout(resultTimer.current) }, [])

  const myRequest = ownCharacter ? pending.find((request) => request.requested_character_id === ownCharacter.id) : undefined
  const shownRequest = myRequest ?? activeRequest ?? undefined
  const othersRequests = pending.filter((request) => request.requested_character_id !== ownCharacter?.id)
  function characterName(id: string) { return characters.find((item) => item.id === id)?.name ?? 'outro personagem' }

  async function roll(input: { roll_request_id?: string; dice: DiceKind; count?: number; modifier?: number; is_test?: boolean; label?: string }) {
    if (rollingRef.current) return
    rollingRef.current = true
    setRolling(true)
    setResult(null)
    setResultTarget(input.roll_request_id ? 'pending' : 'free')
    const startedAt = Date.now()
    try {
      const officialResult = await performDiceRoll({ campaign_id: campaignId, ...input })
      const remaining = prefersReducedMotion() ? 0 : Math.max(0, ROLL_ANIMATION_MS - (Date.now() - startedAt))
      if (remaining) await wait(remaining)
      setResult(officialResult)
      onResult(officialResult)
      if (input.roll_request_id) {
        resultTimer.current = window.setTimeout(() => { setActiveRequest(null); setResult(null); setResultTarget(null) }, 1800)
      }
    } catch (reason) {
      const remaining = prefersReducedMotion() ? 0 : Math.max(0, ROLL_ANIMATION_MS - (Date.now() - startedAt))
      if (remaining) await wait(remaining)
      onError(reason instanceof Error ? reason.message : 'Não foi possível rolar os dados.')
    } finally {
      rollingRef.current = false
      setRolling(false)
    }
  }

  const pendingDice = { dice: 'd20' as DiceKind, count: 1 }
  return (
    <section className="dice-roll-widget" aria-label="Rolagem de dados">
      <SectionTitle icon="teste-d20" title="Seus dados" description={ownCharacter ? `Rolagens de ${ownCharacter.name} são registradas automaticamente.` : 'Você precisa de um personagem nesta campanha para rolar.'} />
      {shownRequest ? (
        <div className="dice-roll-widget__pending" aria-label="Teste pendente">
          <dl className="dice-roll-widget__request-summary">
            <div><dt>Personagem</dt><dd>{ownCharacter?.name}</dd></div>
            <div><dt>Teste</dt><dd>{testLabel(shownRequest) || 'Teste solicitado'}</dd></div>
            <div><dt>Dificuldade</dt><dd>{shownRequest.difficulty ?? '—'}</dd></div>
            <div><dt>Dado oficial</dt><dd>d20</dd></div>
            <div><dt>Modificador</dt><dd>{formatModifier(shownRequest.modifier)}</dd></div>
          </dl>
          {shownRequest.reason ? <p className="dice-roll-widget__pending-reason"><strong>Motivo:</strong> {shownRequest.reason}</p> : null}
          <DiceTray dice={pendingDice.dice} count={pendingDice.count} rolling={rolling && resultTarget === 'pending'} result={resultTarget === 'pending' ? result : null} />
          <MechanicalButton tone="primary" icon="teste-d20" className="dice-button" disabled={rolling || !myRequest} onClick={() => { if (myRequest) { setActiveRequest(myRequest); void roll({ roll_request_id: myRequest.id, dice: 'd20', count: 1, modifier: myRequest.modifier }) } }}>{rolling ? 'Rolando…' : resultTarget === 'pending' && result ? 'Rolagem concluída' : 'Rolar teste'}</MechanicalButton>
        </div>
      ) : null}
      {othersRequests.map((request) => <p key={request.id} className="dice-roll-widget__waiting">Aguardando a rolagem de {characterName(request.requested_character_id)}.</p>)}
      <details className="dice-roll-widget__free-details">
        <summary>Rolagem livre registrada</summary>
        <form className="dice-roll-widget__free" onSubmit={(event) => { event.preventDefault(); if (ownCharacter) void roll({ dice, count, modifier, is_test: isTest, label }) }}>
          <DiceTray dice={dice} count={count} rolling={rolling && resultTarget === 'free'} result={resultTarget === 'free' ? result : null} />
          <DicePicker dice={dice} count={count} disabled={rolling} onChange={(nextDice, nextCount) => { setDice(nextDice); setCount(nextCount); setResult(null) }} />
          <div className="dice-roll-widget__free-options">
            <label>Quantidade<input aria-label="Quantidade" type="number" min={1} max={4} value={count} disabled={rolling} onChange={(event) => setCount(Math.max(1, Math.min(4, Number(event.target.value) || 1)))} /></label>
            <label>Modificador<input type="number" min={-10} max={10} value={modifier} disabled={rolling} onChange={(event) => setModifier(Number(event.target.value))} /></label>
            <label>Rótulo<input maxLength={120} value={label} disabled={rolling} onChange={(event) => setLabel(event.target.value)} /></label>
          </div>
          <label className="dice-roll-widget__test-toggle"><input type="checkbox" checked={isTest} disabled={rolling} onChange={(event) => setIsTest(event.target.checked)} /> Marcar como teste</label>
          <MechanicalButton className="dice-button" type="submit" disabled={rolling || !ownCharacter}>{rolling ? 'Rolando…' : `Rolar ${count} dado${count === 1 ? '' : 's'}`}</MechanicalButton>
        </form>
      </details>
    </section>
  )
}
