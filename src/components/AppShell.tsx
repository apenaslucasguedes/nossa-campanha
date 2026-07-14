import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { IconName } from '../assets/iconRegistry'
import { BrandLogo } from './BrandLogo'
import { Icon } from './Icon'

const links: ReadonlyArray<{ to: string; label: string; icon: IconName }> = [
  { to: '/campanha', label: 'Campanha', icon: 'campanhas' },
  { to: '/personagem', label: 'Ficha', icon: 'personagens' },
  { to: '/mesa', label: 'Mesa', icon: 'mesa' },
  { to: '/mapa', label: 'Mapa', icon: 'mapa' },
  { to: '/compendio', label: 'Compêndio', icon: 'compendio' },
  { to: '/configuracoes', label: 'Ajustes', icon: 'configuracoes' },
]

const priorityLinks = links.slice(0, 4)
const moreLinks = links.slice(4)

function NavigationLink({ to, label, icon }: (typeof links)[number]) {
  return (
    <NavLink to={to} className="navigation-link">
      <Icon name={icon} size={22} decorative />
      <span>{label}</span>
    </NavLink>
  )
}

export function AppShell() {
  const { signOut } = useAuth()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = moreLinks.some((link) => location.pathname.startsWith(link.to))

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandLogo className="brand__full" />
          <BrandLogo compact className="brand__compact" />
        </div>
        <nav aria-label="Navegação principal">
          {links.map((link) => <NavigationLink key={link.to} {...link} />)}
        </nav>
        <button className="text-button" onClick={() => void signOut()}>
          Encerrar sessão
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      {moreOpen ? (
        <button
          type="button"
          className="bottom-nav-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}
      <nav className="bottom-nav" aria-label="Navegação móvel">
        {priorityLinks.map((link) => <NavigationLink key={link.to} {...link} />)}
        <div className="bottom-nav-more">
          {moreOpen ? (
            <div className="bottom-nav-more__sheet" role="menu">
              {moreLinks.map((link) => <NavigationLink key={link.to} {...link} />)}
              <button className="navigation-link" role="menuitem" onClick={() => void signOut()}>
                <Icon name="configuracoes" size={22} decorative />
                <span>Encerrar sessão</span>
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={moreActive ? 'navigation-link active' : 'navigation-link'}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="bottom-nav-more__icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
