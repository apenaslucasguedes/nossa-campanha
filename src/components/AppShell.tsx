import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { IconName } from '../assets/iconRegistry'
import { BrandLogo } from './BrandLogo'
import { Icon } from './Icon'
import { OrnateFrame } from './RelicarioUI'

const links: ReadonlyArray<{ to: string; label: string; icon: IconName }> = [
  { to: '/campanha', label: 'Campanha', icon: 'campanhas' },
  { to: '/personagem', label: 'Ficha', icon: 'personagens' },
  { to: '/mesa', label: 'Mesa', icon: 'mesa' },
  { to: '/mapa', label: 'Mapa', icon: 'mapa' },
]

export function SidebarNavItem({ to, label, icon }: (typeof links)[number]) {
  return (
    <NavLink to={to} className="navigation-link" aria-label={label}>
      <Icon name={icon} size={22} decorative />
      <span className="navigation-link__label">{label}</span>
    </NavLink>
  )
}

export function RelicarioShell() {
  const { signOut } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <span className="sidebar__ornament" aria-hidden="true" />
        <Link className="brand" to="/campanha" aria-label="Voltar para a página inicial">
          <BrandLogo className="brand__full" />
        </Link>
        <nav aria-label="Navegação principal">
          {links.map((link) => <SidebarNavItem key={link.to} {...link} />)}
        </nav>
        <button className="text-button" onClick={() => void signOut()}>
          Encerrar sessão
        </button>
      </aside>
      <main className="main-content">
        <OrnateFrame className="main-frame"><Outlet /></OrnateFrame>
      </main>
      <nav className="bottom-nav" aria-label="Navegação móvel">
        {links.map((link) => <SidebarNavItem key={link.to} {...link} />)}
      </nav>
    </div>
  )
}

export function AppShell() {
  return <RelicarioShell />
}
