// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const handlers:Record<string,()=>void>={}
const subscriptions:Array<{table:string;filter?:string}>=[]
let channelObject:unknown
const on = vi.fn(function(_event:string,config:{table:string;filter?:string},callback:()=>void){handlers[config.table]=callback;subscriptions.push(config);return channelObject})
const subscribe = vi.fn().mockReturnThis()
const channel = vi.fn((topic: string) => { void topic; channelObject={on,subscribe};return channelObject })
const removeChannel = vi.fn(() => undefined)
vi.mock('../lib/supabase', () => ({ supabase: { channel, removeChannel } }))

const { useCampaignRealtime } = await import('./useCampaignRealtime')

describe('useCampaignRealtime', () => {
  it('abre um único canal por campanha e remove ao trocar de campanha', () => {
    const { rerender, unmount } = renderHook(({ id }: { id: string }) => useCampaignRealtime(id, () => {}), { initialProps: { id: 'camp-1' } })
    expect(channel).toHaveBeenCalledTimes(1)
    expect(channel.mock.calls[0][0]).toMatch(/^campaign-live:camp-1:\d+$/)

    rerender({ id: 'camp-2' })
    expect(removeChannel).toHaveBeenCalledTimes(1)
    expect(channel.mock.calls[1][0]).toMatch(/^campaign-live:camp-2:\d+$/)

    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(2)
  })

  it('usa tópicos distintos quando Campanha e Configurações montam juntas', () => {
    const first = renderHook(() => useCampaignRealtime('camp-1', () => {}))
    const second = renderHook(() => useCampaignRealtime('camp-1', () => {}))
    const topics = channel.mock.calls.slice(-2).map(([topic]) => topic)
    expect(topics[0]).not.toBe(topics[1])
    first.unmount(); second.unmount()
  })

  it('usa a coluna id no filtro de campaigns sem invalidar o canal', () => {
    const view=renderHook(()=>useCampaignRealtime('camp-filter',()=>{}))
    expect([...subscriptions].reverse().find(item=>item.table==='campaigns')).toMatchObject({filter:'id=eq.camp-filter'})
    expect([...subscriptions].reverse().find(item=>item.table==='campaign_locations')).toMatchObject({filter:'campaign_id=eq.camp-filter'})
    view.unmount()
  })

  it.each(['character_states','character_conditions'])('refaz a consulta ao receber evento de %s', (table) => {
    const refresh=vi.fn()
    const view=renderHook(()=>useCampaignRealtime('camp-live',refresh))
    handlers[table]()
    expect(refresh).toHaveBeenCalledOnce()
    view.unmount()
  })
})
