// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, it, vi } from 'vitest'
import { getGptMasterUrl, updateGptMasterUrl } from '../data/campaigns'
import { SettingsPage } from './SettingsPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'u1' } } }) }))
vi.mock('../data/campaigns', () => ({ getGptMasterUrl: vi.fn(), updateGptMasterUrl: vi.fn() }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('carrega e salva URL opcional do GPT Mestre', async () => {
  vi.mocked(getGptMasterUrl).mockResolvedValue('https://chatgpt.com/g/teste')
  vi.mocked(updateGptMasterUrl).mockResolvedValue(undefined)
  render(<SettingsPage />)
  expect(await screen.findByDisplayValue('https://chatgpt.com/g/teste')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Endereco do GPT Mestre'), { target: { value: 'https://chatgpt.com/g/novo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar URL' }))
  await waitFor(() => expect(updateGptMasterUrl).toHaveBeenCalledWith('u1', 'https://chatgpt.com/g/novo'))
})

it('aceita URL ausente e bloqueia URL invalida', async () => {
  vi.mocked(getGptMasterUrl).mockResolvedValue(null)
  render(<SettingsPage />)
  const input = await screen.findByLabelText('Endereco do GPT Mestre')
  fireEvent.change(input, { target: { value: 'chatgpt.com/g/teste' } })
  expect(screen.getByText(/iniciada por http/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Salvar URL' })).toBeDisabled()
})
