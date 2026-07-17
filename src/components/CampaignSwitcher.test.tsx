// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CampaignSwitcher } from './CampaignSwitcher'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'u1' } } }) }))
vi.mock('../data/campaignsList', () => ({ listMyCampaigns: () => Promise.resolve([
  { campaign: { id: 'camp-1', name: 'O Relicário de Ardan com um nome muito longo' }, role: 'table_admin', seat: 1 },
  { campaign: { id: 'camp-2', name: 'Segunda campanha' }, role: 'player', seat: 2 },
]) }))
vi.mock('../data/lastCampaign', () => ({ rememberLastCampaign: vi.fn() }))

afterEach(cleanup)

describe('CampaignSwitcher', () => {
  it('usa gatilho truncável com nome completo em title e popover compacto', async () => {
    render(<MemoryRouter initialEntries={['/campanhas/camp-1']}><Routes><Route path="/campanhas/:campaignId" element={<CampaignSwitcher />} /></Routes></MemoryRouter>)
    const trigger = await screen.findByRole('button', { name: /O Relicário de Ardan/ })
    expect(trigger).toHaveAttribute('title', 'O Relicário de Ardan com um nome muito longo')
    fireEvent.click(trigger)
    expect(screen.getByRole('listbox', { name: 'Trocar de campanha' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Segunda campanha' })).toBeInTheDocument()
  })
})
