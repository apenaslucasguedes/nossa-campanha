import { useEffect, useMemo, useState } from 'react'
import { ATTRIBUTE_NAMES } from '../game-data/classes'
import { requestDicePool, requestRoll } from '../data/rolls'
import type { Attributes, Character, DiceSpecItem, Specialty } from '../types/database'
import { Icon } from './Icon'
import { MechanicalButton } from './RelicarioUI'

const SIDES = [4,6,8,10,12,20,100] as const
type Mode='test'|'pool'

export function RollRequestPanel({ campaignId, characters, onError, onRequested }: { campaignId:string; characters:Character[]; onError:(message:string)=>void; onRequested:(message:string)=>void }) {
  const [open,setOpen]=useState(false),[mode,setMode]=useState<Mode>('test'),[characterId,setCharacterId]=useState(characters[0]?.id??'')
  const [attribute,setAttribute]=useState<keyof Attributes|''>(''),[specialty,setSpecialty]=useState<Specialty|''>(''),[difficulty,setDifficulty]=useState<number|''>(''),[reason,setReason]=useState(''),[modifier,setModifier]=useState(0),[busy,setBusy]=useState(false)
  const [pool,setPool]=useState<Partial<Record<DiceSpecItem['sides'],number>>>({})
  const selected=characters.find(item=>item.id===characterId)??characters[0]??null
  const specialties=useMemo(()=>(selected?.character_specialties??[]).map(item=>item.name),[selected])
  useEffect(()=>{if(specialty&&!specialties.includes(specialty))setSpecialty('')},[specialties,specialty])
  const dice=SIDES.flatMap(sides=>pool[sides]?[{sides,quantity:pool[sides]!}]:[])
  const total=dice.reduce((sum,item)=>sum+item.quantity,0)
  const summary=dice.map(item=>`${item.quantity}d${item.sides}`).join(' + ')
  function change(sides:DiceSpecItem['sides'],delta:number){setPool(current=>{const next=Math.max(0,(current[sides]??0)+delta);return {...current,[sides]:next||undefined}})}
  async function submit(){
    if(busy||mode==='test'&&!characterId||mode==='pool'&&!total)return
    setBusy(true)
    try{
      if(mode==='test') await requestRoll({campaign_id:campaignId,character_id:characterId,attribute:attribute||undefined,specialty:specialty||undefined,difficulty:difficulty===''?undefined:difficulty,reason})
      else await requestDicePool({campaign_id:campaignId,character_id:characterId||undefined,dice,modifier,reason})
      onRequested(mode==='test'?`Teste solicitado a ${selected?.name??'personagem'}.`:`${total} dado${total===1?' solicitado':'s solicitados'}.`);setOpen(false);setReason('');setPool({})
    }catch(error){onError(error instanceof Error?error.message:'Não foi possível criar a solicitação.')}finally{setBusy(false)}
  }
  if(!characters.length)return null
  return <div className="roll-request"><MechanicalButton icon="teste-d20" onClick={()=>setOpen(true)}>Solicitar teste</MechanicalButton>{open?<div className="roll-request__backdrop" role="dialog" aria-modal="true" aria-label="Solicitar teste" onClick={event=>{if(event.target===event.currentTarget)setOpen(false)}}><form className="roll-request__panel" onSubmit={event=>{event.preventDefault();void submit()}}>
    <h3>Solicitar</h3><div className="roll-request__modes" role="tablist"><button type="button" role="tab" aria-selected={mode==='test'} onClick={()=>setMode('test')}><Icon name="teste-d20" size={18} decorative/>Teste</button><button type="button" role="tab" aria-selected={mode==='pool'} onClick={()=>setMode('pool')}><Icon name="inventario" size={18} decorative/>Dados livres</button></div>
    {mode==='test'?<><label>Personagem<select value={characterId} onChange={e=>setCharacterId(e.target.value)}>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="roll-request__row"><label>Atributo<select value={attribute} onChange={e=>setAttribute(e.target.value as keyof Attributes|'')}><option value="">Nenhum</option>{Object.entries(ATTRIBUTE_NAMES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Especialidade<select value={specialty} onChange={e=>setSpecialty(e.target.value as Specialty|'')}><option value="">Nenhuma</option>{specialties.map(item=><option key={item}>{item}</option>)}</select></label></div><small>Sem atributo ou especialidade, será solicitado um d20 sem bônus.</small><label>Dificuldade<input type="number" min={1} max={30} value={difficulty} onChange={e=>setDifficulty(e.target.value===''?'':Number(e.target.value))}/></label></>:<><div className="roll-request__dice" aria-label="Selecionar dados">{SIDES.map(sides=><div key={sides} className={pool[sides]?'is-selected':''}><button type="button" className={`die-token die-token--d${sides}`} aria-label={`Adicionar d${sides}`} onClick={()=>change(sides,1)}><span>d{sides}</span></button>{pool[sides]?<span><button type="button" aria-label={`Diminuir d${sides}`} onClick={()=>change(sides,-1)}>−</button><b>d{sides} × {pool[sides]}</b><button type="button" aria-label={`Aumentar d${sides}`} onClick={()=>change(sides,1)} disabled={total>=20}>+</button></span>:null}</div>)}</div><output className="roll-request__pool-summary">{summary||'Selecione um ou mais dados'}</output><label>Personagem opcional<select value={characterId} onChange={e=>setCharacterId(e.target.value)}><option value="">Dados livres</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Modificador<input type="number" min={-20} max={20} value={modifier} onChange={e=>setModifier(Math.max(-20,Math.min(20,Number(e.target.value))))}/></label></>}
    <label>Motivo<input maxLength={240} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="roll-request__actions"><MechanicalButton tone="primary" type="submit" disabled={busy||mode==='test'&&!characterId||mode==='pool'&&!total}>{busy?'Solicitando…':mode==='pool'?`Solicitar ${total} dado${total===1?'':'s'}`:'Solicitar teste'}</MechanicalButton><MechanicalButton type="button" onClick={()=>setOpen(false)}>Cancelar</MechanicalButton></div>
  </form></div>:null}</div>
}
