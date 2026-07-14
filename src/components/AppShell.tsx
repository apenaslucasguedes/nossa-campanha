import { NavLink, Outlet } from 'react-router-dom'
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
      <nav className="bottom-nav" aria-label="Navegação móvel">
        {links.slice(0, 5).map((link) => <NavigationLink key={link.to} {...link} />)}
      </nav>
    </div>
  )
}
