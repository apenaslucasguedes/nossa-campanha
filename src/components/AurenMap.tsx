import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent } from 'react'
import { AUREN_MAP_HEIGHT, AUREN_MAP_WIDTH, aurenRegionIds, aurenRegions, isAurenRegionId, mapMarkerIcons, mapRegistry, type AurenRegionId } from '../assets/mapRegistry'
import { Icon } from './Icon'
import { isAurenActivationKey, prepareAurenSvg, visibleMapLocations, type MapLocation } from './aurenMapUtils'
import { fitAurenMap, INITIAL_AUREN_MAP_TRANSFORM, stageMatrix, zoomAurenMap, type AurenMapTransform, type AurenViewportSize } from './aurenMapTransform'

function RegionOverlay({svg,onSelect,onHover}:{svg:string;onSelect:(id:AurenRegionId)=>void;onHover:(id:AurenRegionId|null)=>void}){
  const findRegion=(target:EventTarget|null)=>{const element=target instanceof Element?target.closest('[data-auren-region]'):null;const id=element?.getAttribute('data-auren-region');return id&&isAurenRegionId(id)?id:null}
  return <div className="auren-map__svg" data-map-layer="interactive" onClick={(event)=>{const id=findRegion(event.target);if(id)onSelect(id)}} onKeyDown={(event)=>{const id=findRegion(event.target);if(id&&isAurenActivationKey(event.key)){event.preventDefault();onSelect(id)}}} onFocus={(event)=>onHover(findRegion(event.target))} onBlur={()=>onHover(null)} onPointerOver={(event)=>onHover(findRegion(event.target))} onPointerLeave={()=>onHover(null)} dangerouslySetInnerHTML={{__html:svg}} />
}

export function AurenMap({locations=[],selected,onSelect}:{locations?:readonly MapLocation[];selected:AurenRegionId|null;onSelect:(id:AurenRegionId|null)=>void}){
  const [svg,setSvg]=useState<string|null>(null),[failed,setFailed]=useState<'svg'|'image'|null>(null),[hovered,setHovered]=useState<AurenRegionId|null>(null),[transform,setTransform]=useState<AurenMapTransform>(INITIAL_AUREN_MAP_TRANSFORM),[viewportSize,setViewportSize]=useState<AurenViewportSize>({width:0,height:0})
  const drag=useRef<{x:number;y:number;origin:AurenMapTransform;fitScale:number;regionId:AurenRegionId|null;moved:boolean}|null>(null), viewport=useRef<HTMLDivElement>(null)
  const shownLocations=useMemo(()=>visibleMapLocations(locations),[locations])
  const measureViewport=useCallback(()=>{const box=viewport.current?.getBoundingClientRect();if(box)setViewportSize({width:box.width,height:box.height})},[])
  useEffect(()=>{let active=true;fetch(mapRegistry.auren.interactive).then((response)=>{if(!response.ok)throw new Error() ;return response.text()}).then(prepareAurenSvg).then((markup)=>{if(active)setSvg(markup)}).catch(()=>{if(active)setFailed('svg')});return()=>{active=false}},[])
  useEffect(()=>{measureViewport();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measureViewport);if(viewport.current)observer?.observe(viewport.current);window.addEventListener('resize',measureViewport);return()=>{observer?.disconnect();window.removeEventListener('resize',measureViewport)}},[measureViewport])
  useEffect(()=>{for(const id of aurenRegionIds)document.querySelector(`[data-auren-region="${id}"]`)?.setAttribute('aria-pressed',String(selected===id))},[selected,svg])
  useEffect(()=>{const focusRegion=(event:Event)=>{const id=(event as CustomEvent<AurenRegionId>).detail;const element=document.querySelector<SVGGraphicsElement>(`[data-auren-region="${id}"]`);const bounds=element?.getBBox();if(!bounds)return;const scale=1.8;const fit=fitAurenMap(viewportSize);const center={x:(viewportSize.width/2-fit.x)/fit.scale,y:(viewportSize.height/2-fit.y)/fit.scale};setTransform({scale,x:center.x-(bounds.x+bounds.width/2)*scale,y:center.y-(bounds.y+bounds.height/2)*scale})};window.addEventListener('auren:center-region',focusRegion);return()=>window.removeEventListener('auren:center-region',focusRegion)},[svg,viewportSize])
  const zoom=(amount:number)=>setTransform((value)=>zoomAurenMap(value,value.scale+amount,viewportSize))
  const center=()=>setTransform(INITIAL_AUREN_MAP_TRANSFORM)
  const startDrag=(event:PointerEvent<HTMLDivElement>)=>{if(event.button!==0)return;const element=event.target instanceof Element?event.target.closest('[data-auren-region]'):null;const id=element?.getAttribute('data-auren-region');event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,origin:transform,fitScale:fitAurenMap(viewportSize).scale,regionId:id&&isAurenRegionId(id)?id:null,moved:false}}
  const moveDrag=(event:PointerEvent<HTMLDivElement>)=>{if(!drag.current)return;const dx=event.clientX-drag.current.x,dy=event.clientY-drag.current.y;if(Math.hypot(dx,dy)>4)drag.current.moved=true;setTransform({...drag.current.origin,x:drag.current.origin.x+dx/drag.current.fitScale,y:drag.current.origin.y+dy/drag.current.fitScale})}
  const endDrag=(event:PointerEvent<HTMLDivElement>)=>{const active=drag.current;drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);if(active?.regionId&&!active.moved)onSelect(active.regionId)}
  const cancelDrag=()=>{drag.current=null}
  const wheel=(event:WheelEvent<HTMLDivElement>)=>{event.preventDefault();zoom(event.deltaY<0?.2:-.2)}
  const matrix=stageMatrix(viewportSize,transform)
  const waterStyle={'--auren-water-image':`url("${mapRegistry.auren.water}")`} as CSSProperties
  return <section className="auren-map" aria-label="Mapa interativo de Auren">
    <div className="auren-map__toolbar" aria-label="Controles do mapa"><button onClick={()=>zoom(.25)} aria-label="Aumentar zoom">+</button><button onClick={()=>zoom(-.25)} aria-label="Diminuir zoom">−</button><button onClick={center}>Centralizar mapa</button><output aria-live="polite">{Math.round(transform.scale*100)}%</output></div>
    <div ref={viewport} className="auren-map__viewport" data-testid="map-viewport" data-water-pattern="repeat" style={waterStyle} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag} onWheel={wheel}>
      {failed?<div className="auren-map__fallback" role="alert">Não foi possível carregar {failed==='svg'?'a camada interativa':'a imagem ilustrada'} do mapa.</div>:null}
      <div className="auren-map__stage" data-testid="map-stage" data-map-scale={transform.scale} data-map-x={transform.x} data-map-y={transform.y} style={{width:AUREN_MAP_WIDTH,height:AUREN_MAP_HEIGHT,transform:`matrix(${matrix.a},0,0,${matrix.d},${matrix.e},${matrix.f})`}}>
        <img data-map-layer="artwork" src={mapRegistry.auren.illustrated} width={mapRegistry.auren.rasterWidth} height={mapRegistry.auren.rasterHeight} alt="Mapa ilustrado de Auren" loading="lazy" draggable={false} onError={()=>setFailed('image')}/>
        {svg?<RegionOverlay svg={svg} onSelect={onSelect} onHover={setHovered}/>:<div className="auren-map__loading" role="status">Carregando regiões…</div>}
        <div className="auren-map__markers" aria-label="Locais revelados">{shownLocations.map((location)=><button key={location.id} className="auren-map__marker" style={{left:`${location.x*100}%`,top:`${location.y*100}%`}} aria-label={location.name}><Icon name={mapMarkerIcons[location.kind]} size={24} decorative/></button>)}</div>
      </div>
      {hovered?<div className="auren-map__tooltip" role="tooltip">{aurenRegions[hovered].name}</div>:null}
    </div>
    <p className="auren-map__empty">{shownLocations.length===0?'Nenhum local revelado disponível para exibição.':`${shownLocations.length} locais revelados.`}</p>
    <details className="auren-map__region-list"><summary>Lista textual de regiões</summary><ul>{aurenRegionIds.map((id)=><li key={id}><button aria-pressed={selected===id} onClick={()=>onSelect(id)}>{aurenRegions[id].name}</button></li>)}</ul></details>
  </section>
}
