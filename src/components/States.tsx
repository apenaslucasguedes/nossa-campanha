import type { ReactNode } from 'react'
import type { IconName } from '../assets/iconRegistry'
import { Icon } from './Icon'
import { RelicarioPanel } from './RelicarioUI'

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <header className="page-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><span className="page-header__rule" aria-hidden="true" />{children ? <p className="lede">{children}</p> : null}</header>
}

export function EmptyState({ title, children, icon }: { title: string; children: ReactNode; icon?: IconName }) {
  return <RelicarioPanel className="empty-state">{icon ? <Icon name={icon} size={40} decorative /> : <span aria-hidden="true">◇</span>}<h2>{title}</h2><p>{children}</p></RelicarioPanel>
}

export function LoadingState() {
  return <div className="loading" role="status"><span className="spinner" />Carregando registros…</div>
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return <div className="error-banner" role="alert">{children}</div>
}
