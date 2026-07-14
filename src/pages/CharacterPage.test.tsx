// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyState } from '../components/States'
import { FilledSheet } from './CharacterPage'

afterEach(cleanup)
import type { Character } from '../types/database'
const character:Character={id:'c',campaign_id:'camp',owner_id:'u',name:'Ayla',class_key:'warrior',level:1,presentation:'mulher',origin:'Fronteira',appearance:'Cabelos curtos.',personality:'Leal.',objective:'Proteger.',fear:'Falhar.',initial_bond:'Amigos',current_bond:'Amigos',attributes:{strength:3,agility:2,intellect:1,presence:1,instinct:0},defense:10,inventory_capacity:11,avatar:{presentation:'feminina',skinTone:'#b97850',hair:'#34251e',primaryColor:'#7f3f36',secondaryColor:'#4f624c',accessory:'broche'},created_at:'',updated_at:'',character_states:{character_id:'c',vitality_current:18,vitality_max:18,resource_current:6,resource_max:6,updated_at:'',updated_by:'u'},character_conditions:[],character_specialties:[{character_id:'c',name:'Atletismo',source:'class',created_at:''},{character_id:'c',name:'Intimidação',source:'class',created_at:''},{character_id:'c',name:'Alquimia',source:'free',created_at:''}]}
it('não repete uma silhueta provisória na aba História',()=>{render(<FilledSheet character={character}/>);fireEvent.click(screen.getByRole('tab',{name:'História'}));expect(screen.queryByText(/Silhueta provisória/i)).not.toBeInTheDocument();expect(screen.getByText('Cabelos curtos.')).toBeInTheDocument()})
describe('estados da ficha',()=>{it('renderiza o estado vazio com orientação',()=>{render(<EmptyState title="Sua ficha ainda não existe">Crie sua ficha.</EmptyState>);expect(screen.getByText('Sua ficha ainda não existe')).toBeInTheDocument()});it('renderiza uma ficha preenchida',()=>{render(<FilledSheet character={character} edit={vi.fn()}/>);expect(screen.getByRole('heading',{name:'Ayla'})).toBeInTheDocument();expect(screen.getByText('Atletismo')).toBeInTheDocument();expect(screen.getByText('18 / 18')).toBeInTheDocument()})})
