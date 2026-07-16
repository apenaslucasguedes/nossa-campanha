import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { IconName } from '../assets/iconRegistry'
import { BrandLogo } from './BrandLogo'
import { CampaignSwitcher } from './CampaignSwitcher'
import { Icon } from './Icon'
import { OrnateFrame } from './RelicarioUI'

function links(campaignId: string | undefined): ReadonlyArray<{ to: string; label: string; icon: IconName }> {
  const base = campaignId ? `/campanhas/${campaignId}` : '/campanhas'
  return [
    { to: base, label: 'Campanha', icon: 'campanhas' },
    { to: `${base}/personagens`, label: 'Ficha', icon: 'personagens' },
    { to: `${base}/mesa`, label: 'Mesa', icon: 'mesa' },
    { to: `${base}/mapa`, label: 'Mapa', icon: 'mapa' },
  ]
}

export function SidebarNavItem({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink to={to} end className="navigation-link" aria-label={label}>
      <Icon name={icon} size={22} decorative />
      <span className="navigation-link__label">{label}</span>
    </NavLink>
  )
}

export function RelicarioShell() {
  const { signOut } = useAuth()
  const { campaignId } = useParams()
  const navLinks = links(campaignId)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <span className="sidebar__ornament" aria-hidden="true" />
        <Link className="brand" to="/campanhas" aria-label="Voltar para a página inicial">
          <BrandLogo className="brand__full" />
        </Link>
        <CampaignSwitcher />
        <nav aria-label="Navegação principal">
          {navLinks.map((link) => <SidebarNavItem key={link.to} {...link} />)}
        </nav>
        <button className="text-button" onClick={() => void signOut()}>
          Encerrar sessão
        </button>
      </aside>
      <main className="main-content">
        <OrnateFrame className="main-frame"><Outlet /></OrnateFrame>
      </main>
      <nav className="bottom-nav" aria-label="Navegação móvel">
        {navLinks.map((link) => <SidebarNavItem key={link.to} {...link} />)}
      </nav>
    </div>
  )
}

export function AppShell() {
  return <RelicarioShell />
}
