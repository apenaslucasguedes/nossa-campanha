// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { aurenNonInteractiveLayerIds, aurenRegions, mapRegistry } from '../assets/mapRegistry'
import { resolveRegionKey } from '../assets/regionRegistry'
import { AurenMap } from '../components/AurenMap'
import { isAurenActivationKey, prepareAurenSvg, visibleMapLocations, type MapLocation } from '../components/aurenMapUtils'

const svg=`<svg id="mapa-auren" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1591.7 916.3"><g id="vale-de-ardan"><path d="M0 0h20v20z"/></g><g id="divisoes-internas"/><path id="contorno-geral" d="M0 0h20v20z"/></svg>`
afterEach(()=>{cleanup();vi.restoreAllMocks()})

describe('mapa de Auren',()=>{
  it('carrega os dois arquivos no mesmo plano lógico',()=>{expect(existsSync(resolve('public/assets/maps/mapa-realista-cortado.png'))).toBe(true);expect(existsSync(resolve('public/assets/maps/mapa-auren.svg'))).toBe(true);expect(mapRegistry.auren.viewBox).toBe('0 0 1591.7 916.3');expect(mapRegistry.auren.width/mapRegistry.auren.height).toBeCloseTo(1591.7/916.3,8);expect(Math.abs(mapRegistry.auren.rasterWidth/mapRegistry.auren.rasterHeight-mapRegistry.auren.width/mapRegistry.auren.height)).toBeLessThan(.002)})
  it('mapeia IDs oficiais e aliases sem alterar as chaves persistidas',()=>{expect(aurenRegions['pantanos-de-varg'].regionKey).toBe('pantanos-negros');expect(aurenRegions['floresta-de-nhalor'].regionKey).toBe('floresta-antiga');expect(resolveRegionKey('Deserto de Sal')).toBe('deserto-branco');expect(resolveRegionKey('Península da Aurora')).toBe('peninsula-dos-mosteiros')})
  it('marca somente regiões como interativas e preserva camadas passivas',()=>{const markup=prepareAurenSvg(svg);const doc=new DOMParser().parseFromString(markup,'image/svg+xml');expect(doc.getElementById('vale-de-ardan')?.getAttribute('role')).toBe('button');for(const id of aurenNonInteractiveLayerIds)expect(doc.getElementById(id)?.getAttribute('data-non-interactive')).toBe('true')})
  it('seleciona por clique e reconhece Enter e Espaço',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}));const select=vi.fn();const {container}=render(<AurenMap selected={null} onSelect={select}/>);await screen.findAllByRole('button',{name:'Vale de Ardan'});const region=container.querySelector<SVGElement>('[data-auren-region="vale-de-ardan"]')!;fireEvent.click(region);expect(select).toHaveBeenCalledWith('vale-de-ardan');expect(isAurenActivationKey('Enter')).toBe(true);expect(isAurenActivationKey(' ')).toBe(true);expect(isAurenActivationKey('Escape')).toBe(false)})
  it('mantém estado vazio e oculta locais não revelados',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}));const hidden:MapLocation={id:'x',name:'Oculto',kind:'cidade',x:.5,y:.5,revealed:false,regionId:'vale-de-ardan'};render(<AurenMap selected={null} onSelect={()=>{}} locations={[hidden]}/>);expect(await screen.findByText('Nenhum local revelado disponível para exibição.')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Oculto'})).not.toBeInTheDocument();expect(visibleMapLocations([hidden])).toHaveLength(0);expect(screen.getByTestId('map-viewport')).toHaveClass('auren-map__viewport')})
  it('mostra fallback quando SVG ou imagem falham',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('falha')));const {container}=render(<AurenMap selected={null} onSelect={()=>{}}/>);expect(await screen.findByRole('alert')).toHaveTextContent('camada interativa');fireEvent.error(container.querySelector('img')!);await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('imagem ilustrada'))})
})
