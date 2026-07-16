import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { aurenRegions, isAurenRegionId, mapMarkerIcons, type AurenRegionId, type MapMarkerKind } from '../assets/mapRegistry'
import { regionRegistry } from '../assets/regionRegistry'
import { AurenMap } from '../components/AurenMap'
import type { MapLocation } from '../components/aurenMapUtils'
import { RegionArtwork } from '../components/RegionArtwork'
import { ErrorBanner } from '../components/States'
import { regions } from '../game-data/regions'
import { useCampaignParam } from '../hooks/useCampaignParam'

function markerKind(value: string | null): MapMarkerKind {
  return value && Object.hasOwn(mapMarkerIcons, value) ? value as MapMarkerKind : 'local-revelado'
}

export function MapPage(){
  const { session } = useAuth()
  const { campaignId } = useParams()
  const { data, error } = useCampaignParam(campaignId, session?.user.id)
  const [params] = useSearchParams()
  const initial = params.get('region')
  const [selected,setSelected]=useState<AurenRegionId|null>(initial && isAurenRegionId(initial) ? initial : null)
  useEffect(() => { if (initial && isAurenRegionId(initial)) setSelected(initial) }, [initial])
  const locations: MapLocation[] = useMemo(() => (data?.locations ?? []).map((location) => ({ id: location.id, name: location.name, kind: markerKind(location.kind), x: Number(location.x), y: Number(location.y), revealed: location.revealed, regionId: location.region_id })), [data?.locations])
  const current=selected?aurenRegions[selected]:null
  const region=selected?regions[selected]:null
  const registered=current?.regionKey?regionRegistry[current.regionKey]:null
  const regionLocations = locations.filter((location) => location.revealed && location.regionId === selected)
  return <div className="map-page"><header className="map-page__header"><p className="eyebrow">Atlas do Relicario</p><h1>Auren</h1><p>Explore as regioes conhecidas. Os locais aparecem somente quando forem revelados na campanha.</p></header>{error ? <ErrorBanner>{error}</ErrorBanner> : null}<div className="map-page__layout"><AurenMap selected={selected} onSelect={setSelected} locations={locations}/><aside className="map-region-panel" aria-live="polite">{current&&region?<>{registered?<RegionArtwork region={current.regionKey} alt={current.name} className="map-region-panel__artwork" loading="lazy"/>:null}<div><p className="eyebrow">Regiao selecionada</p><h2>{current.name}</h2><p>{region.description}</p><h3>Locais revelados</h3>{regionLocations.length ? <ul className="map-location-list">{regionLocations.map((location)=><li key={location.id}>{location.name}</li>)}</ul> : <p>Nenhum local revelado disponivel.</p>}<div className="map-region-panel__actions"><button onClick={()=>{window.dispatchEvent(new CustomEvent('auren:center-region',{detail:selected}));document.querySelector<HTMLElement>(`[data-auren-region="${selected}"]`)?.focus()}}>Centralizar na regiao</button><button onClick={()=>setSelected(null)}>Limpar selecao</button><Link className="card-action card-action--quiet" to={`/campanhas/${campaignId}`}>Voltar para campanha</Link></div></div></>:<div className="map-region-panel__empty"><p className="eyebrow">Regioes de Auren</p><h2>Selecione uma regiao</h2><p>Use o mapa para consultar uma regiao sem ocultar o restante do continente.</p></div>}</aside></div></div>
}
