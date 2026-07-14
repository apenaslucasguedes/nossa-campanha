// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { DiceRoller } from './TableTools'

describe('rolador de dados',()=>{
  it('mostra a bandeja e apresenta a rolagem visual sem alterar o contrato do resultado',()=>{
    const onRoll=vi.fn()
    render(<DiceRoller onRoll={onRoll}/>)

    expect(screen.getByText('Bandeja de rolagem')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Rolar'}))

    expect(onRoll).toHaveBeenCalledOnce()
    expect(onRoll.mock.calls[0][0]).toMatchObject({sides:20,quantity:1,modifier:0})
    expect(screen.getByRole('button',{name:'Rolando...'})).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('1d20 + 0')
  })
})
