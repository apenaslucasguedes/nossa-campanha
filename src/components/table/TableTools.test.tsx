// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DiceRoller, ResourceControl } from './TableTools'

afterEach(()=>cleanup())

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

describe('controle de recursos',()=>{
  it('confirma dano dentro do cartao sem abrir a confirmacao do navegador',()=>{
    const onDamage=vi.fn(),confirm=vi.spyOn(window,'confirm')
    render(<ResourceControl disabled={false} onDamage={onDamage} onHeal={vi.fn()} onResource={vi.fn()}/>)

    fireEvent.click(screen.getByRole('button',{name:'Dano'}))
    expect(screen.getByRole('group',{name:'Confirmar aplicar dano'})).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
    expect(onDamage).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button',{name:'Confirmar'}))
    expect(onDamage).toHaveBeenCalledWith(1)
  })

  it('aplica cura diretamente e pede confirmacao para gastar recurso',()=>{
    const onHeal=vi.fn(),onResource=vi.fn()
    render(<ResourceControl disabled={false} onDamage={vi.fn()} onHeal={onHeal} onResource={onResource}/>)

    fireEvent.click(screen.getByRole('button',{name:'Cura'}))
    expect(onHeal).toHaveBeenCalledWith(1)
    fireEvent.click(screen.getByRole('button',{name:'Gastar recurso'}))
    fireEvent.click(screen.getByRole('button',{name:'Confirmar'}))
    expect(onResource).toHaveBeenCalledWith(-1)
  })
})
