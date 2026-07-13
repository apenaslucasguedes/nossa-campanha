import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { aurenRegionIds, aurenRegions, isAurenRegionId, mapMarkerIcons, mapRegistry, type AurenRegionId } from '../assets/mapRegistry'
import { Icon } from './Icon'
import { isAurenActivationKey, prepareAurenSvg, visibleMapLocations, type MapLocation } from './aurenMapUtils'

type Transform = { scale:number; x:number; y:number }
const INITIAL:Transform={scale:1,x:0,y:0}

function RegionOverlay({svg,onSelect,onHover}:{svg:string;onSelect:(id:AurenRegionId)=>void;onHover:(id:AurenRegionId|null)=>void}){
  const root=useRef<HTMLDivElement>(null)
  const findRegion=(target:EventTarget|null)=>{const element=target instanceof Element?target.closest('[data-auren-region]'):null;const id=element?.getAttribute('data-auren-region');return id&&isAurenRegionId(id)?id:null}
  useEffect(()=>{const key=(event:globalThis.KeyboardEvent)=>{const id=(event.currentTarget as Element).getAttribute('data-auren-region');if(id&&isAurenRegionId(id)&&isAurenActivationKey(event.key)){event.preventDefault();onSelect(id)}};const regions=[...(root.current?.querySelectorAll<SVGElement>('[data-auren-region]')??[])];for(const region of regions)region.onkeydown=key;return()=>{for(const region of regions)region.onkeydown=null}},[onSelect,svg])
  return <div ref={root} className="auren-map__svg" onClick={(event)=>{const id=findRegion(event.target);if(id)onSelect(id)}} onPointerOver={(event)=>onHover(findRegion(event.target))} onPointerLeave={()=>onHover(null)} dangerouslySetInnerHTML={{__html:svg}} />
}

export function AurenMap({locations=[],selected,onSelect}:{locations?:readonly MapLocation[];selected:AurenRegionId|null;onSelect:(id:AurenRegionId|null)=>void}){
  const [svg,setSvg]=useState<string|null>(null),[failed,setFailed]=useState<'svg'|'image'|null>(null),[hovered,setHovered]=useState<AurenRegionId|null>(null),[transform,setTransform]=useState(INITIAL)
  const drag=useRef<{x:number;y:number;origin:Transform}|null>(null), viewport=useRef<HTMLDivElement>(null)
  const shownLocations=useMemo(()=>visibleMapLocations(locations),[locations])
  useEffect(()=>{let active=true;fetch(mapRegistry.auren.interactive).then((response)=>{if(!response.ok)throw new Error() ;return response.text()}).then(prepareAurenSvg).then((markup)=>{if(active)setSvg(markup)}).catch(()=>{if(active)setFailed('svg')});return()=>{active=false}},[])
  useEffect(()=>{for(const id of aurenRegionIds)document.querySelector(`[data-auren-region="${id}"]`)?.setAttribute('aria-pressed',String(selected===id))},[selected,svg])
  useEffect(()=>{const focusRegion=(event:Event)=>{const id=(event as CustomEvent<AurenRegionId>).detail;const element=document.querySelector<SVGGraphicsElement>(`[data-auren-region="${id}"]`);const bounds=element?.getBBox();const box=viewport.current?.getBoundingClientRect();if(!bounds||!box)return;const scale=1.8;setTransform({scale,x:box.width/2-(bounds.x+bounds.width/2)*(box.width/1591.67)*scale,y:box.height/2-(bounds.y+bounds.height/2)*(box.width/1591.67)*scale})};window.addEventListener('auren:center-region',focusRegion);return()=>window.removeEventListener('auren:center-region',focusRegion)},[svg])
  const zoom=(amount:number)=>setTransform((value)=>({...value,scale:Math.min(3,Math.max(1,value.scale+amount))}))
  const center=()=>setTransform(INITIAL)
  const startDrag=(event:PointerEvent<HTMLDivElement>)=>{if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,origin:transform}}
  const moveDrag=(event:PointerEvent<HTMLDivElement>)=>{if(!drag.current)return;setTransform({...drag.current.origin,x:drag.current.origin.x+event.clientX-drag.current.x,y:drag.current.origin.y+event.clientY-drag.current.y})}
  const endDrag=()=>{drag.current=null}
  const wheel=(event:WheelEvent<HTMLDivElement>)=>{event.preventDefault();zoom(event.deltaY<0?.2:-.2)}
  return <section className="auren-map" aria-label="Mapa interativo de Auren">
    <div className="auren-map__toolbar" aria-label="Controles do mapa"><button onClick={()=>zoom(.25)} aria-label="Aumentar zoom">+</button><button onClick={()=>zoom(-.25)} aria-label="Diminuir zoom">−</button><button onClick={center}>Centralizar mapa</button><output aria-live="polite">{Math.round(transform.scale*100)}%</output></div>
    <div ref={viewport} className="auren-map__viewport" data-testid="map-viewport" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onWheel={wheel}>
      {failed?<div className="auren-map__fallback" role="alert">Não foi possível carregar {failed==='svg'?'a camada interativa':'a imagem ilustrada'} do mapa.</div>:null}
      <div className="auren-map__stage" style={{transform:`translate3d(${transform.x}px,${transform.y}px,0) scale(${transform.scale})`}}>
        <img src={mapRegistry.auren.illustrated} alt="Mapa ilustrado de Auren" loading="lazy" draggable={false} onError={()=>setFailed('image')}/>
        {svg?<RegionOverlay svg={svg} onSelect={onSelect} onHover={setHovered}/>:<div className="auren-map__loading" role="status">Carregando regiões…</div>}
        <div className="auren-map__markers" aria-label="Locais revelados">{shownLocations.map((location)=><button key={location.id} className="auren-map__marker" style={{left:`${location.x*100}%`,top:`${location.y*100}%`}} aria-label={location.name}><Icon name={mapMarkerIcons[location.kind]} size={24} decorative/></button>)}</div>
      </div>
      {hovered?<div className="auren-map__tooltip" role="tooltip">{aurenRegions[hovered].name}</div>:null}
    </div>
    <p className="auren-map__empty">{shownLocations.length===0?'Nenhum local revelado disponível para exibição.':`${shownLocations.length} locais revelados.`}</p>
    <details className="auren-map__region-list"><summary>Lista textual de regiões</summary><ul>{aurenRegionIds.map((id)=><li key={id}><button aria-pressed={selected===id} onClick={()=>onSelect(id)}>{aurenRegions[id].name}</button></li>)}</ul></details>
  </section>
}
