import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Character } from '../types/database'
import { CharacterCard } from './CharacterCard'
import { Icon } from './Icon'

export function PlayerSeat({ seat, playerName, character, canCreate = false }: { seat: number; playerName?: string; character?: Character; canCreate?: boolean }) {
  return (
    <section className="player-seat" aria-labelledby={`seat-${seat}-title`}>
      <header className="player-seat__header">
        <span><Icon name="personagens" size={18} decorative /> Assento {seat}</span>
        {playerName ? <strong>{playerName}</strong> : null}
      </header>
      {character ? (
        <CharacterCard character={character} playerName={playerName} action={<Link className="card-action" to="/personagem">Abrir ficha</Link>} headingId={`seat-${seat}-title`} />
      ) : <EmptySeat seat={seat} playerName={playerName} canCreate={canCreate} />}
    </section>
  )
}

export function EmptySeat({ seat, playerName, canCreate = false }: { seat: number; playerName?: string; canCreate?: boolean }) {
  return (
    <div className="empty-seat">
      <Icon name="assento-vazio" size={48} decorative />
      <div>
        <h2 id={`seat-${seat}-title`}>Personagem ainda não criado</h2>
        <p>{playerName ? `${playerName} ocupa este assento, mas ainda não possui ficha.` : 'Este assento ainda não possui personagem.'}</p>
      </div>
      {canCreate ? (
        <Link className="card-action" to="/criar-personagem">Criar personagem</Link>
      ) : (
        <small className="empty-seat__note">Aguardando o outro jogador criar a ficha.</small>
      )}
    </div>
  )
}

export function CampaignCard({ children }: { children: ReactNode }) {
  return <div className="campaign-card">{children}</div>
}
