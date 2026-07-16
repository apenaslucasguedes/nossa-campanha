// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const on = vi.fn().mockReturnThis()
const subscribe = vi.fn().mockReturnThis()
const channel = vi.fn((_name: string) => ({ on, subscribe }))
const removeChannel = vi.fn((_channel: unknown) => undefined)
vi.mock('../lib/supabase', () => ({ supabase: { channel, removeChannel } }))

const { useCampaignRealtime } = await import('./useCampaignRealtime')

describe('useCampaignRealtime', () => {
  it('abre um único canal por campanha e remove ao trocar de campanha', () => {
    const { rerender, unmount } = renderHook(({ id }: { id: string }) => useCampaignRealtime(id, () => {}), { initialProps: { id: 'camp-1' } })
    expect(channel).toHaveBeenCalledTimes(1)
    expect(channel).toHaveBeenCalledWith('campaign-live:camp-1')

    rerender({ id: 'camp-2' })
    expect(removeChannel).toHaveBeenCalledTimes(1)
    expect(channel).toHaveBeenCalledWith('campaign-live:camp-2')

    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(2)
  })
})
