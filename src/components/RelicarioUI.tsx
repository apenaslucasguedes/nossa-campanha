import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { IconName } from '../assets/iconRegistry'
import { Icon } from './Icon'

export function OrnateFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ornate-frame ${className}`.trim()}>{children}</div>
}

export function RelicarioPanel({ children, className = '', labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return <section className={`relicario-panel ${className}`.trim()} aria-labelledby={labelledBy}>{children}</section>
}

export function SectionTitle({ icon, title, description, id }: { icon?: IconName; title: string; description?: ReactNode; id?: string }) {
  return (
    <div className="relicario-section-title">
      {icon ? <Icon name={icon} size={22} decorative /> : null}
      <div>
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  )
}

type MechanicalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconName
  tone?: 'default' | 'primary' | 'danger'
}

export function MechanicalButton({ children, className = '', icon, tone = 'default', ...props }: MechanicalButtonProps) {
  return (
    <button className={`mechanical-button mechanical-button--${tone} ${className}`.trim()} {...props}>
      {icon ? <Icon name={icon} size={19} decorative /> : null}
      <span>{children}</span>
    </button>
  )
}
