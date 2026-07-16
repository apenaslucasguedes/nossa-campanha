// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { CompendiumPage } from './CompendiumPage'

vi.mock('../auth/AuthContext',()=>({useAuth:()=>({signOut:vi.fn()})}))
afterEach(cleanup)
const renderPage=()=>render(<MemoryRouter><CompendiumPage/></MemoryRouter>)

describe('Compêndio',()=>{
 it('renderiza seis classes, cinco atributos, condições e as doze regiões reais',()=>{const{container}=renderPage();expect(container.querySelectorAll('.class-compendium-card')).toHaveLength(6);const attributes=within(screen.getByRole('region',{name:'Atributos'}));for(const name of ['Força','Agilidade','Intelecto','Presença','Instinto'])expect(attributes.getByRole('heading',{name})).toBeInTheDocument();for(const name of ['Ferido','Exausto','Amedrontado','Envenenado','Imobilizado','Desorientado','Corrompido','Caído'])expect(screen.getByRole('heading',{name})).toBeInTheDocument();for(const name of ['Arquipélago de Vesper','Ilhas Cinzentas','Ormara'])expect(screen.getByRole('heading',{name})).toBeInTheDocument();expect(container.querySelectorAll('.region-compendium-card')).toHaveLength(12)})
 it('busca por termos mecânicos',()=>{renderPage();fireEvent.change(screen.getByRole('searchbox',{name:'Buscar no Compêndio'}),{target:{value:'Faísca arcana'}});expect(screen.getByRole('heading',{name:'Arcanista'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Guerreiro'})).not.toBeInTheDocument()})
 it('filtra especialidades por atributo',()=>{renderPage();fireEvent.change(screen.getByLabelText('Categoria'),{target:{value:'specialties'}});fireEvent.change(screen.getByLabelText('Atributo'),{target:{value:'presence'}});expect(screen.getByRole('heading',{name:'Persuasão'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Performance'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Atletismo'})).not.toBeInTheDocument()})
 it('filtra os quatro templates de inimigo por nível',()=>{const{container}=renderPage();fireEvent.change(screen.getByLabelText('Categoria'),{target:{value:'enemies'}});fireEvent.change(screen.getByLabelText('Nível de inimigo'),{target:{value:'3'}});expect(container.querySelectorAll('.compendium-card')).toHaveLength(4);expect(screen.getByRole('heading',{name:'Nível 3 · chefe'})).toBeInTheDocument()})
 it('mantém locais e itens vazios, sem inventar registros',()=>{renderPage();expect(within(screen.getByRole('region',{name:'Locais'})).getByText('Conteúdo ainda não cadastrado.')).toBeInTheDocument();expect(within(screen.getByRole('region',{name:'Itens'})).getByText('Itens e equipamentos')).toBeInTheDocument();expect(screen.getAllByText('Conteúdo ainda não cadastrado.')).toHaveLength(2);expect(screen.queryByText('Espada longa')).not.toBeInTheDocument()})
 it('limita a navegação principal aos quatro destinos prioritários',()=>{render(<MemoryRouter><AppShell/></MemoryRouter>);const desktop=within(screen.getByRole('navigation',{name:'Navegação principal'}));const mobile=within(screen.getByRole('navigation',{name:'Navegação móvel'}));for(const name of ['Campanha','Ficha','Mesa','Mapa']){expect(desktop.getByRole('link',{name})).toBeInTheDocument();expect(mobile.getByRole('link',{name})).toHaveAttribute('aria-label',name)}expect(screen.queryByRole('link',{name:'Compêndio'})).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:'Ajustes'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Mais'})).not.toBeInTheDocument()})
 it('usa o logo como retorno acessível para a página inicial',()=>{render(<MemoryRouter><AppShell/></MemoryRouter>);expect(screen.getByRole('link',{name:'Voltar para a página inicial'})).toHaveAttribute('href','/campanhas')})
})
