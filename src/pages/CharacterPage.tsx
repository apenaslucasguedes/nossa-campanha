import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AbilityCard, AttributeItem, CharacterHeader, CharacterSummary, NarrativeSection, SpecialtyCard } from '../components/CharacterSections'
import { Icon } from '../components/Icon'
import { readPlayerName } from '../components/playerName'
import { EmptyState, ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { deleteMyCharacter, updateMyCharacter } from '../data/campaigns'
import { ATTRIBUTE_KEYS, getClassDefinition } from '../game-data/classes'
import { useCampaign } from '../hooks/useCampaign'
import type { Character } from '../types/database'

export function CharacterPage() {
  const { session } = useAuth()
  const { data, loading, error, refresh } = useCampaign(session?.user.id)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(false)
  if (loading) return <LoadingState />

  const ownCharacter = data?.characters.find((character) => character.owner_id === session?.user.id)
  const selectedCharacter = ownCharacter ?? data?.characters[0]
  const selectedMember = data?.members.find((member) => member.user_id === selectedCharacter?.owner_id)

  if (!data) {
    return <><PageHeader eyebrow="Protagonistas" title="Personagens">Consulte as duas fichas vinculadas à campanha.</PageHeader>{error ? <ErrorBanner>{error}</ErrorBanner> : null}<EmptyState title="Campanha necessária" icon="personagens">Seu usuário precisa estar vinculado a uma campanha antes de consultar ou criar personagens.</EmptyState></>
  }

  async function removeCharacter(character: Character) {
    const confirmation = window.prompt(`Esta ação apaga "${character.name}" e todo o estado da mesa (vitalidade, condições) permanentemente. Digite o nome do personagem para confirmar.`)
    if (confirmation !== character.name) return
    try {
      setSaveError('')
      setDeleting(true)
      await deleteMyCharacter(character.id)
      await refresh()
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Não foi possível apagar o personagem.')
    } finally {
      setDeleting(false)
    }
  }

  return <div className="characters-page"><PageHeader eyebrow="Personagem" title="Ficha">Consulte e atualize sua ficha completa.</PageHeader>{error ? <ErrorBanner>{error}</ErrorBanner> : null}{selectedCharacter ? <section className="selected-sheet" id="ficha-selecionada" aria-label={`Ficha de ${selectedCharacter.name}`}>{saveError ? <ErrorBanner>{saveError}</ErrorBanner> : null}{editing && selectedCharacter.owner_id === session?.user.id ? <EditCharacter character={selectedCharacter} saving={saving} cancel={() => { setSaveError(''); setEditing(false) }} save={async (changes) => { try { setSaving(true); setSaveError(''); await updateMyCharacter(selectedCharacter.id, changes); await refresh(); setEditing(false) } catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar. O conteúdo preenchido foi preservado.') } finally { setSaving(false) } }} /> : <FilledSheet character={selectedCharacter} playerName={readPlayerName(selectedMember)} edit={selectedCharacter.owner_id === session?.user.id ? () => { if (window.confirm('Editar campos narrativos e vínculo atual? Classe e atributos permanecerão protegidos.')) setEditing(true) } : undefined} remove={selectedCharacter.owner_id === session?.user.id ? () => void removeCharacter(selectedCharacter) : undefined} removing={deleting} />}</section> : <EmptyState title="Nenhum personagem criado" icon="personagens">A criação acontece em etapas e só grava dados depois da revisão. <Link to="/criar-personagem">Criar meu personagem</Link>.</EmptyState>}</div>
}

export function FilledSheet({ character, playerName, edit, remove, removing }: { character: Character; playerName?: string; edit?: () => void; remove?: () => void; removing?: boolean }) {
  const role = getClassDefinition(character.class_key)
  const state = character.character_states
  const [tab, setTab] = useState<'overview' | 'abilities' | 'history'>('overview')
  return <article className="full-sheet"><CharacterHeader classKey={character.class_key} name={character.name} level={character.level} playerName={playerName} presentation={character.presentation} origin={character.origin} currentBond={character.current_bond} avatar={character.avatar} edit={edit} remove={remove} removing={removing} /><nav className="sheet-tabs" aria-label="Seções da ficha" role="tablist"><button type="button" role="tab" aria-selected={tab === 'overview'} onClick={() => setTab('overview')}><Icon name="personagens" size={18} decorative />Visão geral</button><button type="button" role="tab" aria-selected={tab === 'abilities'} onClick={() => setTab('abilities')}><Icon name="habilidades" size={18} decorative />Habilidades</button><button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}><Icon name="diario" size={18} decorative />História</button></nav>{tab === 'overview' ? <div className="sheet-tab-panel" role="tabpanel"><CharacterSummary vitality={state ? { current: state.vitality_current, max: state.vitality_max } : undefined} resource={state ? { current: state.resource_current, max: state.resource_max } : undefined} resourceLabel={role.resource} defense={character.defense} inventoryCapacity={character.inventory_capacity} conditions={character.character_conditions} /><section className="sheet-section"><div className="section-heading"><Icon name="teste-d20" size={23} decorative /><div><h3>Atributos</h3><p>Valores protegidos da ficha</p></div></div><div className="attribute-readout">{ATTRIBUTE_KEYS.map((key) => <AttributeItem key={key} attribute={key} value={character.attributes[key]} />)}</div></section><section className="sheet-section"><div className="section-heading"><Icon name="habilidades" size={23} decorative /><div><h3>Especialidades</h3><p>Competências escolhidas na criação</p></div></div><div className="specialty-review">{character.character_specialties.map((item) => <SpecialtyCard key={item.name} name={item.name} />)}</div></section></div> : null}{tab === 'abilities' ? <div className="sheet-tab-panel" role="tabpanel"><section className="sheet-section sheet-section--first"><div className="section-heading"><Icon name="habilidades" size={23} decorative /><div><h3>Habilidades iniciais</h3><p>Conteúdo real da classe no nível 1</p></div></div><div className="ability-grid"><AbilityCard label="Habilidade básica" ability={role.basicAbility} /><AbilityCard label="Habilidade inicial" ability={role.initialAbility} /></div><p className="development-note">Progressão de níveis 2 a 5 ainda não faz parte desta etapa.</p></section></div> : null}{tab === 'history' ? <div className="sheet-tab-panel" role="tabpanel"><NarrativeSection entries={[{ label: 'Aparência', value: character.appearance }, { label: 'Personalidade', value: character.personality }, { label: 'Origem', value: character.origin }, { label: 'Objetivo', value: character.objective }, { label: 'Medo', value: character.fear }, { label: 'Vínculo inicial', value: character.initial_bond }, { label: 'Vínculo atual', value: character.current_bond }]} /></div> : null}</article>
}

function EditCharacter({ character, saving, cancel, save }: { character: Character; saving: boolean; cancel: () => void; save: (changes: Pick<Character, 'presentation' | 'origin' | 'appearance' | 'personality' | 'objective' | 'fear' | 'current_bond' | 'avatar'>) => Promise<void> }) {
  const [form, setForm] = useState({ presentation: character.presentation, origin: character.origin, appearance: character.appearance, personality: character.personality, objective: character.objective, fear: character.fear, current_bond: character.current_bond })
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  return <form className="edit-sheet" onSubmit={(event) => { event.preventDefault(); void save({ ...form, avatar: character.avatar }) }}><header className="edit-sheet__header"><span><Icon name="diario" size={22} decorative /></span><div><h2>Editar narrativa</h2><p>Classe, atributos e valores derivados não são alterados aqui.</p></div></header><div className="form-grid">{Object.entries(form).map(([key, value]) => <label className={key === 'presentation' || key === 'origin' ? '' : 'wide'} key={key}>{({ presentation: 'Gênero ou apresentação', origin: 'Origem', appearance: 'Aparência', personality: 'Personalidade', objective: 'Objetivo', fear: 'Medo', current_bond: 'Vínculo atual' } as Record<string, string>)[key]}{key === 'presentation' || key === 'origin' ? <input required value={value} onChange={(event) => set(key as keyof typeof form, event.target.value)} /> : <textarea required value={value} onChange={(event) => set(key as keyof typeof form, event.target.value)} />}</label>)}</div><div className="wizard-actions"><button type="button" disabled={saving} onClick={cancel}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></div></form>
}
