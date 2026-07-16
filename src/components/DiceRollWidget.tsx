import { useEffect, useRef, useState } from 'react'
import { ATTRIBUTE_NAMES } from '../game-data/classes'
import { listPendingRollRequests, performDiceRoll, subscribeToRollRequests, type PerformRollResult } from '../data/rolls'
import { supabase } from '../lib/supabase'
import type { Character, DiceKind, DiceResultGroup, DiceSpecItem, RollRequest } from '../types/database'
import { MechanicalButton, SectionTitle } from './RelicarioUI'

const DICE: DiceKind[] = ['d4','d6','d8','d10','d12','d20','d100']
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const requestSpec = (request: RollRequest): DiceSpecItem[] => request.request_kind === 'dice_pool' && request.dice_spec ? request.dice_spec : [{ sides:20, quantity:1 }]
const requestCount = (request: RollRequest) => requestSpec(request).reduce((sum,item)=>sum+item.quantity,0)
const testLabel = (request: RollRequest) => [request.attribute ? ATTRIBUTE_NAMES[request.attribute] : null, request.specialty].filter(Boolean).join(' + ') || 'Teste simples'

function Tray({ request, rolling, result }: { request:RollRequest; rolling:boolean; result:PerformRollResult|null }) {
  const groups: DiceResultGroup[] = result?.dice_results ?? []
  let flatIndex = 0
  return <div className={`dice-tray dice-roll-widget__tray${rolling?' is-rolling':''}${result?' has-result':''}`} aria-busy={rolling} data-reduced-motion={reduced()?'true':'false'}>
    <div className="dice-tray__heading"><span>Bandeja de rolagem</span><strong>{result?`Total ${result.total}`:`${requestCount(request)} dado${requestCount(request)===1?'':'s'}`}</strong></div>
    <div className="dice-tray__surface">{requestSpec(request).flatMap(item=>Array.from({length:item.quantity},(_,index)=>{const value=groups.find(group=>group.sides===item.sides)?.results[index]??result?.results[flatIndex++];return <span key={`${item.sides}-${index}`} className={`die-token die-token--d${item.sides}${value==null?' die-token--idle':''}`}><small>d{item.sides}</small>{value!=null?<b>{value}</b>:null}</span>}))}</div>
    <output className="dice-tray__result" aria-live="polite">{rolling?'Rolando…':result?<><span>{groups.length?groups.map(group=>`d${group.sides}: ${group.results.join(', ')}`).join(' · '):result.results.join(' · ')}{result.modifier?` ${result.modifier>0?'+':''}${result.modifier}`:''}</span><em>{result.outcome?`${result.outcome.includes('success')?'Sucesso':'Falha'} · `:''}Total {result.total}</em></>:'Monte o conjunto e faça sua rolagem.'}</output>
  </div>
}

export function DiceRollWidget({ campaignId, ownCharacter, characters, onResult, onError }: { campaignId:string; ownCharacter:Character|null; characters:Character[]; onResult:(result:PerformRollResult)=>void; onError:(message:string)=>void }) {
  const [pending,setPending]=useState<RollRequest[]>([])
  const [active,setActive]=useState<RollRequest|null>(null)
  const [result,setResult]=useState<PerformRollResult|null>(null)
  const [rolling,setRolling]=useState(false)
  const [freeDice,setFreeDice]=useState<DiceKind>('d20')
  const [freeCount,setFreeCount]=useState(1)
  const [freeResult,setFreeResult]=useState<PerformRollResult|null>(null)
  const lock=useRef(false)
  useEffect(()=>{const refresh=()=>void listPendingRollRequests(campaignId).then(setPending);refresh();const channel=subscribeToRollRequests(campaignId,refresh,'player');return()=>{void supabase.removeChannel(channel)}},[campaignId])
  const mine=pending.find(request=>request.requested_character_id===null||request.requested_character_id===ownCharacter?.id)
  const shown=mine??active
  async function run(input: Parameters<typeof performDiceRoll>[0], target:'request'|'free') {
    if(lock.current)return
    lock.current=true;setRolling(true);if(target==='request')setResult(null);else setFreeResult(null)
    try{const official=await performDiceRoll(input);if(target==='request')setResult(official);else setFreeResult(official);onResult(official)}catch(error){onError(error instanceof Error?error.message:'Não foi possível rolar os dados.')}finally{lock.current=false;setRolling(false)}
  }
  const freeRequest:RollRequest={id:'free',campaign_id:campaignId,session_id:null,requested_character_id:ownCharacter?.id??null,requested_by:'',request_kind:'dice_pool',dice_spec:[{sides:Number(freeDice.slice(1)) as DiceSpecItem['sides'],quantity:freeCount}],attribute:null,specialty:null,modifier:0,reason:'',difficulty:null,status:'pending',source:'system',requested_at:'',completed_at:null,resulting_roll_id:null}
  return <section className="dice-roll-widget" aria-label="Rolagem de dados">
    <SectionTitle icon="teste-d20" title="Seus dados" description={ownCharacter?`Rolagens de ${ownCharacter.name} são registradas automaticamente.`:'Você precisa de um personagem nesta campanha para rolar.'}/>
    {shown?<div className="dice-roll-widget__pending" aria-label="Teste pendente"><dl className="dice-roll-widget__request-summary"><div><dt>Personagem</dt><dd>{shown.requested_character_id?characters.find(c=>c.id===shown.requested_character_id)?.name:'Dados livres'}</dd></div><div><dt>{shown.request_kind==='dice_pool'?'Dados':'Teste'}</dt><dd>{shown.request_kind==='dice_pool'?requestSpec(shown).map(d=>`${d.quantity}d${d.sides}`).join(' + '):testLabel(shown)}</dd></div><div><dt>Dificuldade</dt><dd>{shown.difficulty??'—'}</dd></div><div><dt>Modificador</dt><dd>{shown.modifier>=0?'+':''}{shown.modifier}</dd></div></dl>{shown.reason?<p className="dice-roll-widget__pending-reason"><strong>Motivo:</strong> {shown.reason}</p>:null}<Tray request={shown} rolling={rolling} result={result}/><MechanicalButton tone="primary" icon="teste-d20" className="dice-button" disabled={rolling||!mine} onClick={()=>{if(mine){setActive(mine);void run({campaign_id:campaignId,roll_request_id:mine.id,dice:'d20',count:1,modifier:mine.modifier},'request')}}}>{rolling?'Rolando…':result?'Rolagem concluída':shown.request_kind==='dice_pool'?`Rolar ${requestCount(shown)} dados`:'Rolar teste'}</MechanicalButton></div>:null}
    {pending.filter(request=>request!==mine).map(request=><p key={request.id} className="dice-roll-widget__waiting">Aguardando a rolagem de {request.requested_character_id?characters.find(c=>c.id===request.requested_character_id)?.name:'outro jogador'}.</p>)}
    <details className="dice-roll-widget__free-details"><summary>Rolagem livre registrada</summary><div className="dice-roll-widget__free"><Tray request={freeRequest} rolling={rolling} result={freeResult}/><div className="dice-picker dice-roll-widget__picker">{DICE.map(die=><button type="button" key={die} className={`dice-choice__add die-token--${die}`} aria-label={`Selecionar ${die}`} aria-pressed={freeDice===die} onClick={()=>setFreeDice(die)}>{die}</button>)}</div><label>Quantidade<input aria-label="Quantidade" type="number" min={1} max={4} value={freeCount} onChange={event=>setFreeCount(Math.max(1,Math.min(4,Number(event.target.value)||1)))}/></label><MechanicalButton disabled={rolling||!ownCharacter} onClick={()=>void run({campaign_id:campaignId,dice:freeDice,count:freeCount},'free')}>{rolling?'Rolando…':`Rolar ${freeCount} dado${freeCount===1?'':'s'}`}</MechanicalButton></div></details>
  </section>
}
