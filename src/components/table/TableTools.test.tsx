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
    fireEvent.click(screen.getByRole('button',{name:'Rolar 1 dado'}))

    expect(onRoll).toHaveBeenCalledOnce()
    expect(onRoll.mock.calls[0][0]).toMatchObject({quantity:1,entries:[{sides:20}]})
    expect(screen.getByRole('button',{name:'Rolando...'})).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('1 dado(s) lançados')
  })

  it('monta um conjunto com tipos diferentes e não oferece modificador',()=>{
    render(<DiceRoller/>)
    fireEvent.click(screen.getByRole('button',{name:'Adicionar d6'}))
    fireEvent.click(screen.getByRole('button',{name:'Adicionar d6'}))
    fireEvent.click(screen.getByRole('button',{name:'Adicionar d8'}))
    expect(screen.getByRole('button',{name:'Rolar 4 dados'})).toBeInTheDocument()
    expect(screen.queryByLabelText('Modificador')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Remover um d20 da bandeja'}))
    expect(screen.getByRole('button',{name:'Rolar 3 dados'})).toBeInTheDocument()
    expect(screen.queryByLabelText('Motivo opcional')).not.toBeInTheDocument()
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
