// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AurenMap } from './AurenMap'
import { fitAurenMap, INITIAL_AUREN_MAP_TRANSFORM, stageMatrix } from './aurenMapTransform'

const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1591.7 916.3"><g id="vale-de-ardan"><path d="M100 100h200v200z"/></g><g id="divisoes-internas"/><path id="contorno-geral" d="M0 0h1591.7v916.3H0z"/></svg>'

afterEach(()=>{cleanup();vi.restoreAllMocks()})

describe('transformação compartilhada do mapa de Auren',()=>{
  it('calcula o fit centralizado sem offsets arbitrários',()=>{
    const fit=fitAurenMap({width:390,height:325})
    expect(fit.scale).toBeCloseTo(390/1591.7,8)
    expect(fit.x).toBeCloseTo(0,8)
    expect(fit.y).toBeCloseTo((325-916.3*fit.scale)/2,8)
    const matrix=stageMatrix({width:390,height:325},INITIAL_AUREN_MAP_TRANSFORM)
    expect(matrix.a).toBeCloseTo(fit.scale*.9,8)
    expect(matrix.d).toBeCloseTo(fit.scale*.9,8)
    expect(matrix.e).toBeCloseTo(fit.x+fit.scale*1591.7*.05,8)
    expect(matrix.f).toBeCloseTo(fit.y+fit.scale*916.3*.05,8)
  })

  it('mantém PNG, SVG e marcadores dentro do mesmo palco transformável',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}))
    const {container}=render(<AurenMap selected={null} onSelect={()=>{}} locations={[{id:'local',name:'Local',kind:'cidade',x:.5,y:.5,revealed:true,regionId:'vale-de-ardan'}]}/>)
    await screen.findAllByRole('button',{name:'Vale de Ardan'})
    const stage=screen.getByTestId('map-stage')
    expect(stage).toContainElement(container.querySelector('[data-map-layer="water"]'))
    expect(stage).toContainElement(container.querySelector('img'))
    expect(stage).toContainElement(container.querySelector('.auren-map__svg'))
    expect(stage).toContainElement(screen.getByRole('button',{name:'Local'}))
    expect(container.querySelector('img')).not.toHaveAttribute('style')
    expect(container.querySelector('.auren-map__svg')).not.toHaveAttribute('style')
  })

  it('inicia em 90%, centraliza após zoom e recalcula o fit no resize',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}))
    render(<AurenMap selected={null} onSelect={()=>{}}/>)
    await screen.findAllByRole('button',{name:'Vale de Ardan'})
    const viewport=screen.getByTestId('map-viewport')
    vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue({width:390,height:325,x:0,y:0,left:0,top:0,right:390,bottom:325,toJSON:()=>({})})
    fireEvent(window,new Event('resize'))
    await waitFor(()=>expect(screen.getByTestId('map-stage').style.transform).toContain(String(390/1591.7*.9)))
    expect(screen.getByText('90%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Aumentar zoom'}))
    expect(screen.getByText('115%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Centralizar mapa'}))
    const stage=screen.getByTestId('map-stage')
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(Number(stage.getAttribute('data-map-x'))).toBeCloseTo(1591.7*.05,8)
    expect(Number(stage.getAttribute('data-map-y'))).toBeCloseTo(916.3*.05,8)
  })

  it('limita zoom mínimo e máximo',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}))
    render(<AurenMap selected={null} onSelect={()=>{}}/>)
    await screen.findAllByRole('button',{name:'Vale de Ardan'})
    const plus=screen.getByRole('button',{name:'Aumentar zoom'}),minus=screen.getByRole('button',{name:'Diminuir zoom'})
    for(let index=0;index<12;index+=1)fireEvent.click(plus)
    expect(screen.getByText('300%')).toBeInTheDocument()
    for(let index=0;index<12;index+=1)fireEvent.click(minus)
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('distingue seleção curta de arraste sobre uma região',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}))
    const select=vi.fn()
    const {container}=render(<AurenMap selected={null} onSelect={select}/>)
    await screen.findAllByRole('button',{name:'Vale de Ardan'})
    const viewport=screen.getByTestId('map-viewport') as HTMLDivElement & {setPointerCapture:(id:number)=>void;releasePointerCapture:(id:number)=>void;hasPointerCapture:(id:number)=>boolean}
    viewport.setPointerCapture=vi.fn();viewport.releasePointerCapture=vi.fn();viewport.hasPointerCapture=()=>true
    const region=container.querySelector('[data-auren-region="vale-de-ardan"]')!
    fireEvent.pointerDown(region,{button:0,pointerId:1,clientX:100,clientY:100})
    fireEvent.pointerUp(viewport,{pointerId:1,clientX:100,clientY:100})
    expect(select).toHaveBeenCalledWith('vale-de-ardan')
    select.mockClear()
    fireEvent.pointerDown(region,{button:0,pointerId:2,clientX:100,clientY:100})
    fireEvent.pointerMove(viewport,{pointerId:2,clientX:120,clientY:120})
    fireEvent.pointerUp(viewport,{pointerId:2,clientX:120,clientY:120})
    expect(select).not.toHaveBeenCalled()
  })

  it('captura a roda dentro do mapa sem rolar a página',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}))
    render(<AurenMap selected={null} onSelect={()=>{}}/>)
    await screen.findAllByRole('button',{name:'Vale de Ardan'})
    const viewport=screen.getByTestId('map-viewport')
    const wheel=new WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true})
    viewport.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)
    await waitFor(()=>expect(screen.getByText('110%')).toBeInTheDocument())
  })

  it('impede o arraste nativo da arte do mapa',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,text:async()=>svg}))
    const {container}=render(<AurenMap selected={null} onSelect={()=>{}}/>)
    await screen.findAllByRole('button',{name:'Vale de Ardan'})
    const artwork=container.querySelector('[data-map-layer="artwork"]')!
    const dragStart=new Event('dragstart',{bubbles:true,cancelable:true})
    artwork.dispatchEvent(dragStart)
    expect(dragStart.defaultPrevented).toBe(true)
    expect(artwork).toHaveAttribute('draggable','false')
  })
})
