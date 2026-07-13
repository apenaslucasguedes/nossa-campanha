import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { EmptySeat } from '../components/CampaignCard'
import { AvatarPreview } from '../components/AvatarPreview'
import { CharacterCard } from '../components/CharacterCard'
import { readPlayerName } from '../components/playerName'
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { updateMyCharacter } from '../data/campaigns'
import { ATTRIBUTE_KEYS, ATTRIBUTE_NAMES, getClassDefinition } from '../game-data/classes'
import { useCampaign } from '../hooks/useCampaign'
import type { Character } from '../types/database'

export function CharacterPage() {
  const { session } = useAuth()
  const { data, loading, error, refresh } = useCampaign(session?.user.id)
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>()
  if (loading) return <LoadingState />

  const ownCharacter = data?.characters.find((character) => character.owner_id === session?.user.id)
  const selectedCharacter = data?.characters.find((character) => character.id === selectedCharacterId) ?? ownCharacter ?? data?.characters[0]

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Protagonistas" title="Personagens">Consulte as duas fichas vinculadas à campanha.</PageHeader>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <EmptyState title="Campanha necessária" icon="personagens">Seu usuário precisa estar vinculado a uma campanha antes de consultar ou criar personagens.</EmptyState>
      </>
    )
  }

  function openSheet(characterId: string) {
    setSelectedCharacterId(characterId)
    setEditing(false)
    window.requestAnimationFrame(() => document.getElementById('ficha-selecionada')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="characters-page">
      <PageHeader eyebrow="Protagonistas" title="Personagens">Os dois assentos da campanha, seus recursos e condições atuais.</PageHeader>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <section className="protagonist-grid" aria-label="Protagonistas da campanha">
        {[1, 2].map((seat) => {
          const member = data.members.find((item) => item.seat === seat)
          const character = data.characters.find((item) => item.owner_id === member?.user_id)
          return character ? (
            <CharacterCard key={seat} character={character} playerName={readPlayerName(member)} action={<button className="card-action" type="button" onClick={() => openSheet(character.id)}>Abrir ficha</button>} />
          ) : <EmptySeat key={seat} seat={seat} playerName={readPlayerName(member)} canCreate={member?.user_id === session?.user.id} />
        })}
      </section>

      {selectedCharacter ? (
        <section className="selected-sheet" id="ficha-selecionada" aria-label={`Ficha de ${selectedCharacter.name}`}>
          {saveError ? <ErrorBanner>{saveError}</ErrorBanner> : null}
          {editing && selectedCharacter.owner_id === session?.user.id ? (
            <EditCharacter character={selectedCharacter} cancel={() => setEditing(false)} save={async (changes) => {
              try {
                setSaveError('')
                await updateMyCharacter(selectedCharacter.id, changes)
                await refresh()
                setEditing(false)
              } catch (reason) {
                setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar.')
              }
            }} />
          ) : <FilledSheet character={selectedCharacter} edit={selectedCharacter.owner_id === session?.user.id ? () => {
            if (window.confirm('Editar campos narrativos, vínculo atual e cores? Classe e atributos permanecerão protegidos.')) setEditing(true)
          } : undefined} />}
        </section>
      ) : (
        <EmptyState title="Nenhum personagem criado" icon="personagens">A criação acontece em etapas e só grava dados depois da revisão. <Link to="/criar-personagem">Criar meu personagem</Link>.</EmptyState>
      )}
    </div>
  )
}

export function FilledSheet({ character, edit }: { character: Character; edit?: () => void }) {
  const role = getClassDefinition(character.class_key)
  const state = character.character_states
  return <article className="full-sheet"><div className="sheet-identity"><AvatarPreview avatar={character.avatar} name={character.name} /><div><p className="eyebrow">{character.presentation} · {character.origin}</p><h2>{character.name}</h2><p>{role.role}</p>{edit ? <button onClick={edit}>Editar ficha</button> : null}</div></div><dl className="derived-strip"><div><dt>Vitalidade</dt><dd>{state ? `${state.vitality_current} / ${state.vitality_max}` : '—'}</dd></div><div><dt>{role.resource}</dt><dd>{state ? `${state.resource_current} / ${state.resource_max}` : '—'}</dd></div><div><dt>Defesa</dt><dd>{character.defense}</dd></div><div><dt>Inventário</dt><dd>{character.inventory_capacity}</dd></div></dl><section className="sheet-section"><h3>Atributos</h3><div className="attribute-readout">{ATTRIBUTE_KEYS.map((key) => <div key={key}><span>{ATTRIBUTE_NAMES[key]}</span><strong>{character.attributes[key]}</strong></div>)}</div></section><section className="sheet-columns"><div className="sheet-section"><h3>Especialidades</h3><ul>{character.character_specialties.map((item) => <li key={item.name}>{item.name}</li>)}</ul><h3>Habilidades iniciais</h3><p><strong>Básica:</strong> {role.basicAbility}</p><p><strong>Inicial:</strong> {role.initialAbility}</p></div><div className="sheet-section"><h3>Vínculo</h3><p><strong>Inicial:</strong> {character.initial_bond}</p><p><strong>Atual:</strong> {character.current_bond}</p><h3>Aparência</h3><p>{character.appearance}</p></div></section><section className="sheet-section"><h3>História pessoal</h3><dl className="review-list"><div><dt>Personalidade</dt><dd>{character.personality}</dd></div><div><dt>Objetivo</dt><dd>{character.objective}</dd></div><div><dt>Medo</dt><dd>{character.fear}</dd></div></dl></section></article>
}

function EditCharacter({ character, cancel, save }: { character: Character; cancel: () => void; save: (changes: Pick<Character, 'presentation' | 'origin' | 'appearance' | 'personality' | 'objective' | 'fear' | 'current_bond' | 'avatar'>) => Promise<void> }) {
  const [form, setForm] = useState({ presentation: character.presentation, origin: character.origin, appearance: character.appearance, personality: character.personality, objective: character.objective, fear: character.fear, current_bond: character.current_bond })
  const [avatar, setAvatar] = useState(character.avatar)
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  return <form className="edit-sheet" onSubmit={(event) => { event.preventDefault(); void save({ ...form, avatar }) }}><h2>Editar narrativa e visual</h2><p className="stage-help">Classe, atributos e valores derivados não são alterados aqui.</p><div className="visual-builder"><AvatarPreview avatar={avatar} name={character.name} /><div className="visual-controls"><label>Tom de pele<input type="color" value={avatar.skinTone} onChange={(event) => setAvatar({ ...avatar, skinTone: event.target.value })} /></label><label>Cabelo<input type="color" value={avatar.hair} onChange={(event) => setAvatar({ ...avatar, hair: event.target.value })} /></label><label>Roupa principal<input type="color" value={avatar.primaryColor} onChange={(event) => setAvatar({ ...avatar, primaryColor: event.target.value })} /></label><label>Roupa secundária<input type="color" value={avatar.secondaryColor} onChange={(event) => setAvatar({ ...avatar, secondaryColor: event.target.value })} /></label></div></div><div className="form-grid">{Object.entries(form).map(([key, value]) => <label className={key === 'presentation' || key === 'origin' ? '' : 'wide'} key={key}>{({ presentation: 'Gênero ou apresentação', origin: 'Origem', appearance: 'Aparência', personality: 'Personalidade', objective: 'Objetivo', fear: 'Medo', current_bond: 'Vínculo atual' } as Record<string, string>)[key]}{key === 'presentation' || key === 'origin' ? <input required value={value} onChange={(event) => set(key as keyof typeof form, event.target.value)} /> : <textarea required value={value} onChange={(event) => set(key as keyof typeof form, event.target.value)} />}</label>)}</div><div className="wizard-actions"><button type="button" onClick={cancel}>Cancelar</button><button className="primary-button">Salvar alterações</button></div></form>
}
