import { AUREN_MAP_HEIGHT, AUREN_MAP_WIDTH } from '../assets/mapRegistry'

export type AurenMapTransform = { scale:number; x:number; y:number }
export type AurenViewportSize = { width:number; height:number }

export const AUREN_MIN_ZOOM = .9
export const AUREN_MAX_ZOOM = 3
export const INITIAL_AUREN_MAP_TRANSFORM:AurenMapTransform = {
  scale:AUREN_MIN_ZOOM,
  x:AUREN_MAP_WIDTH*(1-AUREN_MIN_ZOOM)/2,
  y:AUREN_MAP_HEIGHT*(1-AUREN_MIN_ZOOM)/2,
}

export function fitAurenMap({width,height}:AurenViewportSize){
  if(width<=0||height<=0)return { scale:1, x:0, y:0 }
  const scale=Math.min(width/AUREN_MAP_WIDTH,height/AUREN_MAP_HEIGHT)
  return { scale, x:(width-AUREN_MAP_WIDTH*scale)/2, y:(height-AUREN_MAP_HEIGHT*scale)/2 }
}

export function stageMatrix(viewport:AurenViewportSize,transform:AurenMapTransform){
  const fit=fitAurenMap(viewport)
  return { a:fit.scale*transform.scale, d:fit.scale*transform.scale, e:fit.x+fit.scale*transform.x, f:fit.y+fit.scale*transform.y }
}

export function clampAurenZoom(scale:number){
  return Math.min(AUREN_MAX_ZOOM,Math.max(AUREN_MIN_ZOOM,scale))
}

export function zoomAurenMap(transform:AurenMapTransform,nextScale:number,viewport:AurenViewportSize){
  const scale=clampAurenZoom(nextScale)
  if(scale===transform.scale)return transform
  const fit=fitAurenMap(viewport)
  const centerInFit={ x:(viewport.width/2-fit.x)/fit.scale, y:(viewport.height/2-fit.y)/fit.scale }
  const focusedPoint={ x:(centerInFit.x-transform.x)/transform.scale, y:(centerInFit.y-transform.y)/transform.scale }
  return { scale, x:centerInFit.x-focusedPoint.x*scale, y:centerInFit.y-focusedPoint.y*scale }
}
