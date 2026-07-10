import type { ReactNode } from 'react'
export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) { return <header className="page-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children ? <p className="lede">{children}</p> : null}</header> }
export function EmptyState({ title, children }: { title: string; children: ReactNode }) { return <section className="empty-state"><span aria-hidden="true">◇</span><h2>{title}</h2><p>{children}</p></section> }
export function LoadingState() { return <div className="loading" role="status"><span className="spinner"/>Carregando registros…</div> }
export function ErrorBanner({ children }: { children: ReactNode }) { return <div className="error-banner" role="alert">{children}</div> }
