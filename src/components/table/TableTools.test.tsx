// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConditionEditor, DiceRoller, PlayerCombatCard, ResourceControl } from './TableTools'
import type { Character } from '../../types/database'

const responsiveCss=readFileSync(join(process.cwd(),'src','relicario-theme.css'),'utf8')

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
    expect(screen.getByRole('button',{name:'Remover um d20 da bandeja'})).not.toHaveTextContent('×')
    expect(screen.queryByLabelText('Modificador')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Remover um d20 da bandeja'}))
    expect(screen.getByRole('button',{name:'Rolar 3 dados'})).toBeInTheDocument()
    expect(screen.queryByLabelText('Motivo opcional')).not.toBeInTheDocument()
  })
})

describe('condições por ícone',()=>{
  it('adiciona pelo ícone e remove ao clicar na condição ativa',()=>{
    const onAdd=vi.fn(),onRemove=vi.fn()
    render(<ConditionEditor disabled={false} conditions={[{id:'condition-1',character_id:'character-1',name:'Ferido',created_by:'user-1',created_at:''}]} onAdd={onAdd} onRemove={onRemove}/>)
    fireEvent.click(screen.getByRole('button',{name:'Adicionar Exausto'}))
    expect(onAdd).toHaveBeenCalledWith('Exausto',{kind:'indefinite'})
    fireEvent.click(screen.getByRole('button',{name:'Remover Ferido'}))
    expect(onRemove).toHaveBeenCalledWith('condition-1','Ferido')
    expect(screen.queryByRole('combobox',{name:'Condição'})).not.toBeInTheDocument()
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

const character={id:'character-1',campaign_id:'campaign-1',owner_id:'user-1',name:'Aldra',class_key:'warrior',level:1,presentation:'',origin:'',appearance:'',personality:'',objective:'',fear:'',initial_bond:'',current_bond:'',attributes:{strength:1,agility:1,intellect:1,presence:1,instinct:1},defense:10,inventory_capacity:7,avatar:{presentation:'masculino',skinTone:'medium',hair:'short',primaryColor:'#000',secondaryColor:'#fff',accessory:'none'},created_at:'',updated_at:'',character_states:{character_id:'character-1',vitality_current:9,vitality_max:11,resource_current:3,resource_max:5,updated_at:'',updated_by:'user-1'},character_conditions:[{id:'condition-1',character_id:'character-1',name:'Ferido',created_by:'user-1',created_at:''}],character_specialties:[]} as Character
const cardProps={character,currentRegion:'vale-auren',refreshing:false,onRefresh:vi.fn(),onDamage:vi.fn(),onHeal:vi.fn(),onResource:vi.fn(),onAddCondition:vi.fn(),onRemoveCondition:vi.fn(),onFallen:vi.fn(),onStabilize:vi.fn()}

describe('experiência individual dos personagens',()=>{
  it('mantém a grade responsiva vinculada à largura da área de jogadores',()=>{
    expect(responsiveCss).toContain('.table-panel--players {\n  container-type: inline-size;')
    expect(responsiveCss).toContain('@container (max-width: 919px)')
    expect(responsiveCss).toContain('@container (max-width: 619px)')
  })

  it('mostra o próprio card completo com ajustes mecânicos',()=>{
    const{container}=render(<PlayerCombatCard {...cardProps} mode="primary" canEdit playerName="Você"/>)
    expect(container.querySelector('.player-combat-card--primary .player-combat-card__aside')).toBeInTheDocument()
    expect(container.querySelector('.player-combat-card--primary .player-combat-card__body')).toBeInTheDocument()
    expect(container.querySelectorAll('.player-vitals .resource-bar')).toHaveLength(2)
    expect(screen.getByRole('heading',{name:'Aldra'})).toBeInTheDocument()
    expect(screen.getByRole('region',{name:'Ajustes rápidos'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Dano'}));fireEvent.click(screen.getByRole('button',{name:'Confirmar'}))
    expect(cardProps.onDamage).toHaveBeenCalledWith(1)
  })

  it('mostra o outro card compacto sem controles de edição',()=>{
    const{container}=render(<PlayerCombatCard {...cardProps} mode="secondary" canEdit={false}/>)
    expect(container.querySelector('.player-summary-card .player-summary-card__body')).toBeInTheDocument()
    expect(container.querySelectorAll('.player-summary-card__meters .resource-bar')).toHaveLength(2)
    expect(screen.getByRole('heading',{name:'Aldra'})).toBeInTheDocument()
    expect(screen.getByText('9 / 11')).toBeInTheDocument()
    expect(screen.queryByRole('region',{name:'Ajustes rápidos'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Dano'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Remover Ferido'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Marcar Caído'})).not.toBeInTheDocument()
  })

  it('atualiza manualmente e expõe o ajuste administrativo só no menu',()=>{
    const onRefresh=vi.fn()
    render(<PlayerCombatCard {...cardProps} onRefresh={onRefresh} mode="secondary" canEdit={false} canAdminAdjust/>)
    fireEvent.click(screen.getByRole('button',{name:'Atualizar estado'}))
    expect(onRefresh).toHaveBeenCalledOnce()
    expect(screen.getByTitle('Ajustar como mestre')).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Dano'})).not.toBeInTheDocument()
  })
})
