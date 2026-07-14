import { useState } from 'react'
import { aurenRegions, type AurenRegionId } from '../assets/mapRegistry'
import { regionRegistry } from '../assets/regionRegistry'
import { AurenMap } from '../components/AurenMap'
import { RegionArtwork } from '../components/RegionArtwork'
import { regions } from '../game-data/regions'

export function MapPage(){
  const [selected,setSelected]=useState<AurenRegionId|null>(null)
  const current=selected?aurenRegions[selected]:null
  const region=selected?regions[selected]:null
  const registered=current?.regionKey?regionRegistry[current.regionKey]:null
  return <div className="map-page"><header className="map-page__header"><p className="eyebrow">Atlas do Relicário</p><h1>Auren</h1><p>Explore as regiões conhecidas. Os locais aparecem somente quando forem revelados na campanha.</p></header><div className="map-page__layout"><AurenMap selected={selected} onSelect={setSelected}/><aside className="map-region-panel" aria-live="polite">{current&&region?<>{registered?<RegionArtwork region={current.regionKey} alt={current.name} className="map-region-panel__artwork" loading="lazy"/>:null}<div><p className="eyebrow">Região selecionada</p><h2>{current.name}</h2><p>{region.description}</p><h3>Locais revelados</h3><p>Nenhum local revelado disponível.</p><div className="map-region-panel__actions"><button onClick={()=>{window.dispatchEvent(new CustomEvent('auren:center-region',{detail:selected}));document.querySelector<HTMLElement>(`[data-auren-region="${selected}"]`)?.focus()}}>Centralizar na região</button><button onClick={()=>setSelected(null)}>Limpar seleção</button></div></div></>:<div className="map-region-panel__empty"><p className="eyebrow">Regiões de Auren</p><h2>Selecione uma região</h2><p>Use o mapa para consultar uma região sem ocultar o restante do continente.</p></div>}</aside></div></div>
}
