// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const on = vi.fn().mockReturnThis()
const subscribe = vi.fn().mockReturnThis()
const channel = vi.fn((_topic: string) => ({ on, subscribe }))
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
})
