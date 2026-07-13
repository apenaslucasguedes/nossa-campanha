import { aurenNonInteractiveLayerIds, aurenRegionIds, aurenRegions, mapRegistry, type AurenRegionId, type MapMarkerKind } from '../assets/mapRegistry'

export type MapLocation = { id:string; name:string; kind:MapMarkerKind; x:number; y:number; revealed:boolean; regionId:AurenRegionId; mission?:string; rumor?:string }

export function visibleMapLocations(locations:readonly MapLocation[]){return locations.filter((location)=>location.revealed)}
export function isAurenActivationKey(key:string){return key==='Enter'||key===' '}

export function prepareAurenSvg(source:string){
  const document=new DOMParser().parseFromString(source,'image/svg+xml')
  const svg=document.documentElement
  if(svg.nodeName.toLowerCase()!=='svg'||document.querySelector('parsererror'))throw new Error('SVG inválido')
  if(svg.getAttribute('viewBox')!==mapRegistry.auren.viewBox)throw new Error('viewBox incompatível')
  svg.setAttribute('aria-label','Regiões de Auren')
  for(const id of aurenRegionIds){const region=document.getElementById(id);if(!region)continue;region.setAttribute('role','button');region.setAttribute('tabindex','0');region.setAttribute('aria-label',aurenRegions[id].name);region.setAttribute('data-auren-region',id)}
  for(const id of aurenNonInteractiveLayerIds){const layer=document.getElementById(id);layer?.setAttribute('aria-hidden','true');layer?.setAttribute('data-non-interactive','true')}
  return svg.outerHTML
}
