import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AvatarPreview } from '../components/AvatarPreview'
import { CharacterPortrait } from '../components/CharacterPortrait'
import { AttributeItem, CharacterReview, CreationStepHeader, SpecialtyCard } from '../components/CharacterSections'
import { Icon } from '../components/Icon'
import { ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { createMyCharacter, type CreateCharacterInput } from '../data/campaigns'
import { ATTRIBUTE_KEYS, ATTRIBUTE_NAMES, CLASSES, getClassDefinition, SPECIALTIES } from '../game-data/classes'
import { calculateDerived, isValidAttributeDistribution, isValidSpecialties } from '../game-data/rules'
import { useCampaign } from '../hooks/useCampaign'
import type { Attributes, AvatarOptions, ClassKey, Specialty } from '../types/database'

const STEPS = ['Classe', 'Atributos', 'Identidade', 'Vínculo', 'Especialidades', 'Visual', 'Revisão']
const BONDS = ['Amigos', 'Irmãos', 'Casal', 'Desconhecidos', 'Antigos rivais', 'Membros da mesma ordem', 'Dívida compartilhada', 'Um salvou o outro', 'Personalizado']
const defaultAvatar: AvatarOptions = { presentation: 'andrógina', skinTone: '#b97850', hair: '#34251e', primaryColor: '#7f3f36', secondaryColor: '#4f624c', accessory: 'broche' }
const classAvatarPalette: Record<ClassKey, Pick<AvatarOptions, 'primaryColor' | 'secondaryColor'>> = {
  warrior: { primaryColor: '#874c3b', secondaryColor: '#4f4037' },
  arcanist: { primaryColor: '#536b8f', secondaryColor: '#343b58' },
  shadow_blade: { primaryColor: '#5f5277', secondaryColor: '#292633' },
  necromancer: { primaryColor: '#53634d', secondaryColor: '#3f3348' },
  bard: { primaryColor: '#a06f3f', secondaryColor: '#733f45' },
  druid: { primaryColor: '#55705a', secondaryColor: '#69513c' },
}

export function CreateCharacterPage() {
  const { session } = useAuth()
  const { data, loading } = useCampaign(session?.user.id)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [classKey, setClassKey] = useState<ClassKey>('warrior')
  const role = getClassDefinition(classKey)
  const [attributes, setAttributes] = useState<Attributes>(role.suggested)
  const [form, setForm] = useState({ name: '', presentation: '', origin: '', appearance: '', personality: '', objective: '', fear: '', bond: 'Amigos', customBond: '' })
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [avatar, setAvatar] = useState(defaultAvatar)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const derived = useMemo(() => calculateDerived(classKey, attributes), [classKey, attributes])

  if (loading) return <LoadingState />
  if (data?.characters.some((character) => character.owner_id === session?.user.id)) return <Navigate to="/personagem" replace />
  if (!data) return <><PageHeader eyebrow="Criação" title="Campanha necessária" /><ErrorBanner>Seu usuário precisa estar vinculado a uma campanha antes de criar a ficha.</ErrorBanner></>

  const bond = form.bond === 'Personalizado' ? form.customBond.trim() : form.bond
  const valid = [true, isValidAttributeDistribution(attributes), Boolean(form.name.trim() && form.presentation.trim() && form.origin.trim() && form.appearance.trim() && form.personality.trim() && form.objective.trim() && form.fear.trim()), Boolean(bond), isValidSpecialties(specialties, role.specialties), true, true][step]

  function chooseClass(key: ClassKey) {
    setClassKey(key)
    setAttributes(getClassDefinition(key).suggested)
    setSpecialties([])
    setAvatar((current) => ({ ...current, ...classAvatarPalette[key] }))
  }

  function setField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function confirm() {
    if (!session || !isValidAttributeDistribution(attributes) || !isValidSpecialties(specialties, role.specialties)) return
    setSaving(true)
    setError('')
    const payload: CreateCharacterInput = { name: form.name.trim(), class_key: classKey, presentation: form.presentation.trim(), origin: form.origin.trim(), appearance: form.appearance.trim(), personality: form.personality.trim(), objective: form.objective.trim(), fear: form.fear.trim(), bond, attributes, specialties, avatar }
    try {
      await createMyCharacter(payload)
      navigate('/personagem', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a ficha.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="creation-page"><PageHeader eyebrow="Criação de personagem" title="Forje sua ficha">Sete etapas para reunir identidade e mecânica antes de criar o personagem real.</PageHeader><ol className="stepper" aria-label="Etapas da criação">{STEPS.map((label, index) => <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''}><button type="button" onClick={() => index < step && setStep(index)} disabled={index > step} aria-current={index === step ? 'step' : undefined} aria-label={`${index + 1}. ${label}${index === step ? ', etapa atual' : index < step ? ', concluída' : ', indisponível'}`}><span>{index < step ? '✓' : index + 1}</span>{label}</button></li>)}</ol><section className="creation-stage" aria-labelledby="stage-title">{step === 0 ? <ClassStep selected={classKey} choose={chooseClass} /> : null}{step === 1 ? <AttributesStep value={attributes} onChange={setAttributes} derived={derived} resourceLabel={role.resource} /> : null}{step === 2 ? <IdentityStep form={form} setField={setField} /> : null}{step === 3 ? <BondStep form={form} setField={setField} /> : null}{step === 4 ? <SpecialtiesStep selected={specialties} suggestions={role.specialties} onChange={setSpecialties} /> : null}{step === 5 ? <VisualStep avatar={avatar} setAvatar={setAvatar} name={form.name} classKey={classKey} /> : null}{step === 6 ? <Review input={{ ...form, bond, classKey, attributes, specialties, avatar }} derived={derived} /> : null}</section>{error ? <ErrorBanner>{error}</ErrorBanner> : null}<div className="wizard-actions">{step > 0 ? <button type="button" onClick={() => setStep((value) => value - 1)}>Voltar</button> : <span />}{step < STEPS.length - 1 ? <button type="button" className="primary-button" disabled={!valid} onClick={() => setStep((value) => value + 1)}>Continuar</button> : <button type="button" className="primary-button" disabled={saving} onClick={() => void confirm()}>{saving ? 'Criando ficha…' : 'Criar meu personagem'}</button>}</div></div>
}

function ClassStep({ selected, choose }: { selected: ClassKey; choose: (key: ClassKey) => void }) {
  return <><CreationStepHeader step={0} title="Escolha sua classe"><p>Compare função, atributo principal e recursos de nível 1. A seleção define a sugestão inicial de atributos.</p></CreationStepHeader><div className="class-grid">{CLASSES.map((item) => { const preview = calculateDerived(item.key, item.suggested); return <button type="button" className={item.key === selected ? 'class-option selected' : 'class-option'} data-character-class={item.key} onClick={() => choose(item.key)} key={item.key} aria-pressed={item.key === selected}><CharacterPortrait classKey={item.key} name={item.name} compact /><span className="class-option__selection">{item.key === selected ? 'Classe selecionada' : 'Selecionar classe'}</span><span className="class-option__role">{item.role}</span><strong className="class-option__name"><Icon name={classIcon(item.key)} size={22} decorative />{item.name}</strong><dl><div><dt>Atributo principal</dt><dd><Icon name={attributeIcon(item.primary)} size={16} decorative />{ATTRIBUTE_NAMES[item.primary]}</dd></div><div><dt>Recurso</dt><dd><Icon name="recurso-de-classe" size={16} decorative />{item.resource}</dd></div><div><dt>Vitalidade prevista</dt><dd><Icon name="vitalidade" size={16} decorative />{preview.vitality}</dd></div></dl><div className="class-option__abilities"><p><strong>Básica</strong>{item.basicAbility}</p><p><strong>Inicial</strong>{item.initialAbility}</p></div></button> })}</div></>
}

function AttributesStep({ value, onChange, derived, resourceLabel }: { value: Attributes; onChange: (value: Attributes) => void; derived: ReturnType<typeof calculateDerived>; resourceLabel: string }) {
  return <><CreationStepHeader step={1} title="Distribua seus atributos"><p>Use os valores <strong>3, 2, 1, 1 e 0</strong>. A soma permanece 7 e nenhum atributo ultrapassa 3.</p></CreationStepHeader><div className="attribute-grid">{ATTRIBUTE_KEYS.map((key) => <label className="attribute-control" key={key}><AttributeItem attribute={key} value={value[key]} control={<select aria-label={`Valor de ${ATTRIBUTE_NAMES[key]}`} value={value[key]} onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })}>{[0, 1, 2, 3].map((number) => <option key={number}>{number}</option>)}</select>} /></label>)}</div>{!isValidAttributeDistribution(value) ? <ErrorBanner>A distribuição deve conter exatamente 3, 2, 1, 1 e 0.</ErrorBanner> : null}<Derived derived={derived} resourceLabel={resourceLabel} /></>
}

function IdentityStep({ form, setField }: { form: Record<string, string>; setField: (name: 'name' | 'presentation' | 'origin' | 'appearance' | 'personality' | 'objective' | 'fear', value: string) => void }) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const fields = [['name', 'Nome', 80, 'Como o personagem será reconhecido.'], ['presentation', 'Pronomes ou gênero narrativo', 80, 'Texto narrativo; não altera a arte ou o avatar.'], ['origin', 'Origem', 120, 'Lugar, povo ou contexto de onde veio.'], ['appearance', 'Aparência', 800, 'Traços visíveis e presença em cena.'], ['personality', 'Personalidade', 800, 'Temperamento, hábitos e modo de agir.'], ['objective', 'Objetivo', 500, 'O que move o personagem agora.'], ['fear', 'Medo', 500, 'O que ele teme perder ou enfrentar.']] as const
  return <><CreationStepHeader step={2} title="Dê identidade ao personagem"><p>Estes campos compõem a história da ficha e poderão ser editados pela ação explícita de edição.</p></CreationStepHeader><div className="form-grid">{fields.map(([key, label, max, help]) => { const invalid = Boolean(touched[key] && !form[key].trim()); const helpId = `${key}-help`; const errorId = `${key}-error`; return <label key={key} className={key === 'name' || key === 'presentation' || key === 'origin' ? '' : 'wide'}>{label}{max > 120 ? <textarea required maxLength={max} value={form[key]} aria-describedby={`${helpId}${invalid ? ` ${errorId}` : ''}`} aria-invalid={invalid || undefined} onBlur={() => setTouched((current) => ({ ...current, [key]: true }))} onChange={(event) => setField(key, event.target.value)} /> : <input required maxLength={max} value={form[key]} aria-describedby={`${helpId}${invalid ? ` ${errorId}` : ''}`} aria-invalid={invalid || undefined} onBlur={() => setTouched((current) => ({ ...current, [key]: true }))} onChange={(event) => setField(key, event.target.value)} />}<small id={helpId}>{help}</small>{invalid ? <span className="field-error" id={errorId}>Preencha este campo para continuar.</span> : null}</label> })}</div></>
}

function BondStep({ form, setField }: { form: Record<string, string>; setField: (name: 'bond' | 'customBond', value: string) => void }) {
  return <><CreationStepHeader step={3} title="Como vocês começam ligados?"><p>O vínculo inicial fica preservado. O vínculo atual começa igual e poderá evoluir na ficha.</p></CreationStepHeader><div className="bond-grid">{BONDS.map((item) => <label className={form.bond === item ? 'selected' : ''} key={item}><input type="radio" name="bond" checked={form.bond === item} onChange={() => setField('bond', item)} /><Icon name="amuleto" size={19} decorative /><span>{item}</span></label>)}</div>{form.bond === 'Personalizado' ? <label className="custom-bond">Descreva o vínculo<input required maxLength={240} value={form.customBond} onChange={(event) => setField('customBond', event.target.value)} />{!form.customBond.trim() ? <span className="field-error">Descreva o vínculo para continuar.</span> : null}</label> : null}</>
}

function SpecialtiesStep({ selected, suggestions, onChange }: { selected: Specialty[]; suggestions: readonly Specialty[]; onChange: (value: Specialty[]) => void }) {
  function toggle(value: Specialty) { onChange(selected.includes(value) ? selected.filter((item) => item !== value) : selected.length < 3 ? [...selected, value] : selected) }
  return <><CreationStepHeader step={4} title="Escolha três especialidades"><p>Duas devem vir das sugestões da classe; a terceira pode ser qualquer especialidade. Uma escolha nunca pode se repetir.</p></CreationStepHeader><div className="specialty-status" aria-live="polite"><Icon name="habilidades" size={20} decorative /><strong>{selected.length} de 3</strong> escolhidas</div><div className="specialty-grid">{SPECIALTIES.map((item) => <label key={item}><SpecialtyCard name={item} suggested={suggestions.includes(item)} selected={selected.includes(item)} control={<input type="checkbox" checked={selected.includes(item)} disabled={!selected.includes(item) && selected.length === 3} onChange={() => toggle(item)} aria-label={`Selecionar ${item}`} />} /></label>)}</div>{selected.length === 3 && !isValidSpecialties(selected, suggestions) ? <ErrorBanner>Escolha pelo menos duas sugestões da classe.</ErrorBanner> : null}</>
}

function VisualStep({ avatar, setAvatar, name, classKey }: { avatar: AvatarOptions; setAvatar: (value: AvatarOptions) => void; name: string; classKey: ClassKey }) {
  const set = (key: keyof AvatarOptions, value: string) => setAvatar({ ...avatar, [key]: value })
  return <><CreationStepHeader step={5} title="Defina a apresentação visual"><p>A arte é exclusiva da classe. Os controles abaixo ajustam apenas as opções visuais já suportadas pela ficha.</p></CreationStepHeader><div className="visual-builder"><div className="creation-preview-stack"><CharacterPortrait classKey={classKey} name={name || getClassDefinition(classKey).name} /><AvatarPreview avatar={avatar} name={name} /></div><div className="visual-controls"><label>Apresentação do avatar<select value={avatar.presentation} onChange={(event) => set('presentation', event.target.value)}><option>feminina</option><option>masculina</option><option>andrógina</option></select></label><Color label="Tom de pele" value={avatar.skinTone} change={(value) => set('skinTone', value)} /><Color label="Cabelo" value={avatar.hair} change={(value) => set('hair', value)} /><Color label="Roupa principal" value={avatar.primaryColor} change={(value) => set('primaryColor', value)} /><Color label="Roupa secundária" value={avatar.secondaryColor} change={(value) => set('secondaryColor', value)} /><label>Acessório<select value={avatar.accessory} onChange={(event) => set('accessory', event.target.value)}><option value="broche">Broche</option><option value="capa">Capa</option><option value="brinco">Brinco</option><option value="nenhum">Nenhum</option></select></label></div></div></>
}

function Color({ label, value, change }: { label: string; value: string; change: (value: string) => void }) { return <label>{label}<input type="color" value={value} onChange={(event) => change(event.target.value)} /></label> }

function Derived({ derived, resourceLabel }: { derived: ReturnType<typeof calculateDerived>; resourceLabel: string }) {
  return <dl className="derived-strip" aria-label="Valores calculados em tempo real"><div><dt><Icon name="vitalidade" size={18} decorative />Vitalidade</dt><dd>{derived.vitality}</dd></div><div><dt><Icon name="defesa" size={18} decorative />Defesa</dt><dd>{derived.defense}</dd></div><div><dt><Icon name="inventario" size={18} decorative />Inventário</dt><dd>{derived.inventoryCapacity}</dd></div><div><dt><Icon name="recurso-de-classe" size={18} decorative />{resourceLabel}</dt><dd>{derived.resource}</dd></div></dl>
}

function Review({ input, derived }: { input: { name: string; presentation: string; origin: string; appearance: string; personality: string; objective: string; fear: string; bond: string; classKey: ClassKey; attributes: Attributes; specialties: Specialty[]; avatar: AvatarOptions }; derived: ReturnType<typeof calculateDerived> }) {
  return <><CreationStepHeader step={6} title="Revise antes de criar"><p>Confira identidade, escolhas mecânicas e visual. Nenhum dado foi gravado ainda.</p></CreationStepHeader><CharacterReview input={input} derived={derived} /></>
}

function attributeIcon(attribute: keyof Attributes) {
  return ({ strength: 'forca', agility: 'agilidade', intellect: 'intelecto', presence: 'presenca', instinct: 'instinto' } as const)[attribute]
}

function classIcon(classKey: ClassKey) {
  return ({ warrior: 'guerreiro', arcanist: 'arcanista', shadow_blade: 'lamina-sombria', necromancer: 'necromante', bard: 'bardo', druid: 'druida' } as const)[classKey]
}
