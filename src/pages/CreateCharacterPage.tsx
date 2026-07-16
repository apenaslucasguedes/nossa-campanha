import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CharacterPortrait } from '../components/CharacterPortrait'
import { AttributeItem, CharacterReview, CreationStepHeader, SpecialtyCard } from '../components/CharacterSections'
import { EditableCharacterArtwork } from '../components/EditableCharacterArtwork'
import { Icon } from '../components/Icon'
import { ErrorBanner, PageHeader } from '../components/States'
import { createMyCharacter, type CreateCharacterInput } from '../data/campaigns'
import { characterColorSchemas, type ColorLayer } from '../game-data/characterColorSchemas'
import { getCharacterNameGender, getRandomCharacterName } from '../game-data/characterNames'
import { ATTRIBUTE_KEYS, ATTRIBUTE_NAMES, CLASSES, getClassDefinition, SPECIALTIES } from '../game-data/classes'
import { calculateDerived, isValidAttributeDistribution, isValidSpecialties } from '../game-data/rules'
import type { Attributes, AvatarOptions, ClassKey, Specialty } from '../types/database'

const STEPS = ['Classe', 'Atributos', 'Identidade', 'Vínculo', 'Especialidades', 'Visual', 'Revisão']
const BONDS = ['Amigos', 'Irmãos', 'Casal', 'Desconhecidos', 'Antigos rivais', 'Membros da mesma ordem', 'Dívida compartilhada', 'Um salvou o outro', 'Personalizado']
const DRAFT_KEY = 'relicario:create-character-draft'

type ColorsByClass = Partial<Record<ClassKey, Record<string, string>>>

type Draft = {
  step: number
  classKey: ClassKey
  attributes: Attributes
  form: IdentityForm
  specialties: Specialty[]
  colorsByClass: ColorsByClass
}

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore storage failures
  }
}

type IdentityForm = {
  name: string
  presentation: string
  origin: string
  appearance: string
  personality: string
  objective: string
  fear: string
  bond: string
  customBond: string
}

export function CreateCharacterPage() {
  const { session } = useAuth()
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const draft = useMemo(() => loadDraft(), [])
  const [step, setStep] = useState(draft?.step ?? 0)
  const [classKey, setClassKey] = useState<ClassKey>(draft?.classKey ?? 'warrior')
  const role = getClassDefinition(classKey)
  const [attributes, setAttributes] = useState<Attributes>(draft?.attributes ?? role.suggested)
  const [form, setForm] = useState<IdentityForm>(draft?.form ?? { name: '', presentation: '', origin: '', appearance: '', personality: '', objective: '', fear: '', bond: 'Amigos', customBond: '' })
  const [specialties, setSpecialties] = useState<Specialty[]>(draft?.specialties ?? [])
  const [colorsByClass, setColorsByClass] = useState<ColorsByClass>(draft?.colorsByClass ?? {})
  const [defaultsByClass, setDefaultsByClass] = useState<ColorsByClass>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const derived = useMemo(() => calculateDerived(classKey, attributes), [classKey, attributes])
  const colors = colorsByClass[classKey] ?? {}
  const defaults = defaultsByClass[classKey] ?? {}

  useEffect(() => {
    if (saving) return
    const nextDraft: Draft = { step, classKey, attributes, form, specialties, colorsByClass }
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft))
    } catch {
      // ignore storage failures
    }
  }, [step, classKey, attributes, form, specialties, colorsByClass, saving])

  function setLayerColor(key: string, value: string) {
    setColorsByClass((current) => ({ ...current, [classKey]: { ...current[classKey], [key]: value } }))
  }

  function resetLayerColor(key: string) {
    setColorsByClass((current) => {
      const rest = { ...current[classKey] }
      delete rest[key]
      return { ...current, [classKey]: rest }
    })
  }

  function resetAllColors() {
    setColorsByClass((current) => ({ ...current, [classKey]: {} }))
  }

  function recordDefaults(classForDefaults: ClassKey, values: Record<string, string>) {
    setDefaultsByClass((current) => ({ ...current, [classForDefaults]: values }))
  }

  const bond = form.bond === 'Personalizado' ? form.customBond.trim() : form.bond
  const valid = [
    true,
    isValidAttributeDistribution(attributes),
    Boolean(form.name.trim() && form.presentation.trim() && form.origin.trim() && form.appearance.trim() && form.personality.trim() && form.objective.trim() && form.fear.trim()),
    Boolean(bond),
    isValidSpecialties(specialties, role.specialties),
    true,
    true,
  ][step]

  function chooseClass(key: ClassKey) {
    setClassKey(key)
    setAttributes(getClassDefinition(key).suggested)
    setSpecialties([])
  }

  function setField(name: keyof IdentityForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function confirm() {
    if (!session || !isValidAttributeDistribution(attributes) || !isValidSpecialties(specialties, role.specialties)) return
    setSaving(true)
    setError('')
    const resolvedColors = { ...defaults, ...colors }
    const avatar: AvatarOptions = {
      presentation: form.presentation.trim(),
      accessory: 'nenhum',
      skinTone: colors.skin ?? defaults.skin ?? '#b97850',
      hair: colors.hair ?? defaults.hair ?? colors.skin ?? defaults.skin ?? '#34251e',
      primaryColor: colors.outfit ?? colors.armor ?? defaults.outfit ?? defaults.armor ?? '#7f3f36',
      secondaryColor: colors.accessory ?? colors.cape ?? defaults.accessory ?? defaults.cape ?? '#4f624c',
      layerColors: resolvedColors,
    }
    const payload: CreateCharacterInput = {
      name: form.name.trim(),
      class_key: classKey,
      presentation: form.presentation.trim(),
      origin: form.origin.trim(),
      appearance: form.appearance.trim(),
      personality: form.personality.trim(),
      objective: form.objective.trim(),
      fear: form.fear.trim(),
      bond,
      attributes,
      specialties,
      avatar,
      campaign_id: campaignId ?? null,
    }

    try {
      await createMyCharacter(payload)
      clearDraft()
      navigate(campaignId ? `/campanhas/${campaignId}/personagens` : '/campanhas', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a ficha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="creation-page">
      <PageHeader eyebrow="Criação de personagem" title="Forje sua ficha">Sete etapas para reunir identidade e mecânica antes de criar o personagem real.</PageHeader>
      <ol className="stepper" aria-label="Etapas da criação">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''}>
            <button type="button" onClick={() => index < step && setStep(index)} disabled={index > step} aria-current={index === step ? 'step' : undefined} aria-label={`${index + 1}. ${label}${index === step ? ', etapa atual' : index < step ? ', concluída' : ', indisponível'}`}>
              <span>{index < step ? '✓' : index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      <section className="creation-stage" aria-labelledby="stage-title">
        {step === 0 ? <ClassStep selected={classKey} choose={chooseClass} /> : null}
        {step === 1 ? <AttributesStep value={attributes} onChange={setAttributes} derived={derived} resourceLabel={role.resource} /> : null}
        {step === 2 ? <IdentityStep form={form} setField={setField} /> : null}
        {step === 3 ? <BondStep form={form} setField={setField} /> : null}
        {step === 4 ? <SpecialtiesStep selected={specialties} suggestions={role.specialties} onChange={setSpecialties} /> : null}
        {step === 5 ? (
          <VisualStep
            classKey={classKey}
            colors={colors}
            defaults={defaults}
            setColor={setLayerColor}
            resetColor={resetLayerColor}
            resetAll={resetAllColors}
            onDefaultsLoaded={(values) => recordDefaults(classKey, values)}
          />
        ) : null}
        {step === 6 ? <Review input={{ ...form, bond, classKey, attributes, specialties }} colors={{ ...defaults, ...colors }} derived={derived} /> : null}
      </section>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <div className="wizard-actions">
        {step > 0 ? <button type="button" onClick={() => setStep((value) => value - 1)}>Voltar</button> : <span />}
        {step < STEPS.length - 1 ? <button type="button" className="primary-button" disabled={!valid} onClick={() => setStep((value) => value + 1)}>Continuar</button> : <button type="button" className="primary-button" disabled={saving} onClick={() => void confirm()}>{saving ? 'Criando ficha...' : 'Criar meu personagem'}</button>}
      </div>
    </div>
  )
}

function ClassStep({ selected, choose }: { selected: ClassKey; choose: (key: ClassKey) => void }) {
  return <><CreationStepHeader step={0} title="Escolha sua classe"><p>Compare função, atributo principal e recursos de nível 1. A seleção define a sugestão inicial de atributos.</p></CreationStepHeader><div className="class-grid">{CLASSES.map((item) => { const preview = calculateDerived(item.key, item.suggested); return <button type="button" className={item.key === selected ? 'class-option selected' : 'class-option'} data-character-class={item.key} onClick={() => choose(item.key)} key={item.key} aria-pressed={item.key === selected}><CharacterPortrait classKey={item.key} name={item.name} compact /><span className="class-option__selection">{item.key === selected ? 'Classe selecionada' : 'Selecionar classe'}</span><span className="class-option__role">{item.role}</span><strong className="class-option__name">{item.name}</strong><dl><div><dt>Atributo</dt><dd><Icon name={attributeIcon(item.primary)} size={16} decorative />{ATTRIBUTE_NAMES[item.primary]}</dd></div><div><dt>Recurso</dt><dd><Icon name="recurso-de-classe" size={16} decorative />{item.resource}</dd></div><div><dt>Vida</dt><dd><Icon name="vitalidade" size={16} decorative />{preview.vitality}</dd></div></dl><div className="class-option__abilities"><ClassAbility label="Básica" ability={item.basicAbility} /><ClassAbility label="Inicial" ability={item.initialAbility} /></div></button> })}</div></>
}

function ClassAbility({ label, ability }: { label: string; ability: string }) {
  const [name, ...explanation] = ability.split(' — ')
  return <p><strong>{label}</strong><span className="class-option__ability-name">{name}</span>{explanation.length ? <span className="class-option__ability-note">{explanation.join(' — ')}</span> : null}</p>
}

function AttributesStep({ value, onChange, derived, resourceLabel }: { value: Attributes; onChange: (value: Attributes) => void; derived: ReturnType<typeof calculateDerived>; resourceLabel: string }) {
  return <><CreationStepHeader step={1} title="Distribua seus atributos"><p>Use os valores <strong>3, 2, 1, 1 e 0</strong>. Clique novamente no valor ativo para zerar.</p></CreationStepHeader><div className="attribute-grid">{ATTRIBUTE_KEYS.map((key) => <div className="attribute-control" key={key}><AttributeItem attribute={key} value={value[key]} control={<AttributeMeter label={ATTRIBUTE_NAMES[key]} value={value[key]} onChange={(number) => onChange({ ...value, [key]: number })} />} /></div>)}</div>{!isValidAttributeDistribution(value) ? <ErrorBanner>A distribuição deve conter exatamente 3, 2, 1, 1 e 0.</ErrorBanner> : null}<Derived derived={derived} resourceLabel={resourceLabel} /></>
}

function AttributeMeter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="attribute-meter" role="group" aria-label={`Valor de ${label}: ${value}`}>{[1, 2, 3].map((number) => <button key={number} type="button" className={number <= value ? 'is-filled' : ''} aria-label={value === number ? `Zerar ${label}` : `Definir ${label} como ${number}`} aria-pressed={value === number} onClick={() => onChange(value === number ? 0 : number)}><span>{number}</span></button>)}</div>
}

function IdentityStep({ form, setField }: { form: IdentityForm; setField: (name: keyof Pick<IdentityForm, 'name' | 'presentation' | 'origin' | 'appearance' | 'personality' | 'objective' | 'fear'>, value: string) => void }) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const gender = getCharacterNameGender(form.presentation)
  const nameInvalid = Boolean(touched.name && !form.name.trim())
  const fields = [
    ['origin', 'Origem', 120, 'Lugar, povo ou contexto de onde veio.'],
    ['appearance', 'Aparência', 800, 'Traços visíveis e presença em cena.'],
    ['personality', 'Personalidade', 800, 'Temperamento, hábitos e modo de agir.'],
    ['objective', 'Objetivo', 500, 'O que move o personagem agora.'],
    ['fear', 'Medo', 500, 'O que ele teme perder ou enfrentar.'],
  ] as const

  return <><CreationStepHeader step={2} title="Dê identidade ao personagem"><p>Preencha os dados de identidade do personagem. Os campos maiores aceitam mais detalhe.</p></CreationStepHeader><div className="form-grid form-grid--identity"><div className="identity-field identity-field--name"><label htmlFor="character-name">Nome</label><div className="character-name-control"><input id="character-name" required maxLength={80} value={form.name} aria-describedby={`name-help${nameInvalid ? ' name-error' : ''}`} aria-invalid={nameInvalid || undefined} onBlur={() => setTouched((current) => ({ ...current, name: true }))} onChange={(event) => setField('name', event.target.value)} /><button type="button" title="Sortear nome" aria-label={gender ? `Sortear nome ${gender === 'masculine' ? 'masculino' : 'feminino'}` : 'Sortear nome — escolha o gênero'} disabled={!gender} onClick={() => gender && setField('name', getRandomCharacterName(gender, form.name))}><Icon name="teste-d20" size={24} decorative /></button></div><small id="name-help">Como o personagem será reconhecido.{!gender ? <span className="character-name-control__hint"> Escolha o gênero para sortear um nome.</span> : null}</small>{nameInvalid ? <span className="field-error" id="name-error">Preencha este campo para continuar.</span> : null}</div><fieldset className="identity-field identity-field--gender"><legend>Gênero</legend><div className="gender-selector">{([['masculine', 'Masculino', 'masculino'], ['feminine', 'Feminino', 'feminino']] as const).map(([value, label, icon]) => <button key={value} type="button" data-gender={value} className={gender === value ? 'is-selected' : ''} aria-label={`Selecionar gênero ${label.toLocaleLowerCase('pt-BR')}`} aria-pressed={gender === value} onClick={() => setField('presentation', label)}><Icon name={icon} size={26} decorative /><span>{label}</span></button>)}</div><small>Define a lista usada no sorteio de nome.</small></fieldset>{fields.map(([key, label, max, help]) => { const invalid = Boolean(touched[key] && !form[key].trim()); const helpId = `${key}-help`; const errorId = `${key}-error`; return <label key={key} className={`identity-field identity-field--${key}`}>{label}{max > 120 ? <textarea required rows={max > 500 ? 3 : 2} maxLength={max} value={form[key]} aria-describedby={`${helpId}${invalid ? ` ${errorId}` : ''}`} aria-invalid={invalid || undefined} onBlur={() => setTouched((current) => ({ ...current, [key]: true }))} onChange={(event) => setField(key, event.target.value)} /> : <input required maxLength={max} value={form[key]} aria-describedby={`${helpId}${invalid ? ` ${errorId}` : ''}`} aria-invalid={invalid || undefined} onBlur={() => setTouched((current) => ({ ...current, [key]: true }))} onChange={(event) => setField(key, event.target.value)} />}<small id={helpId}>{help}</small>{invalid ? <span className="field-error" id={errorId}>Preencha este campo para continuar.</span> : null}</label> })}</div></>
}

function BondStep({ form, setField }: { form: IdentityForm; setField: (name: 'bond' | 'customBond', value: string) => void }) {
  return <><CreationStepHeader step={3} title="Como vocês começam ligados?"><p>O vínculo inicial fica preservado. O vínculo atual começa igual e poderá evoluir na ficha.</p></CreationStepHeader><div className="bond-grid">{BONDS.map((item) => <label className={form.bond === item ? 'selected' : ''} key={item}><input type="radio" name="bond" checked={form.bond === item} onChange={() => setField('bond', item)} /><span>{item}</span></label>)}</div>{form.bond === 'Personalizado' ? <label className="custom-bond">Descreva o vínculo<input required maxLength={240} value={form.customBond} onChange={(event) => setField('customBond', event.target.value)} />{!form.customBond.trim() ? <span className="field-error">Descreva o vínculo para continuar.</span> : null}</label> : null}</>
}

function SpecialtiesStep({ selected, suggestions, onChange }: { selected: Specialty[]; suggestions: readonly Specialty[]; onChange: (value: Specialty[]) => void }) {
  function toggle(value: Specialty) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : selected.length < 3 ? [...selected, value] : selected)
  }

  return <><CreationStepHeader step={4} title="Escolha três especialidades"><p>Duas devem vir das sugestões da classe; a terceira pode ser qualquer especialidade.</p></CreationStepHeader><div className="specialty-status" aria-live="polite"><strong>{selected.length} de 3</strong> escolhidas</div><div className="specialty-grid">{SPECIALTIES.map((item) => <label key={item}><SpecialtyCard name={item} suggested={suggestions.includes(item)} selected={selected.includes(item)} control={<input type="checkbox" checked={selected.includes(item)} disabled={!selected.includes(item) && selected.length === 3} onChange={() => toggle(item)} aria-label={`Selecionar ${item}`} />} /></label>)}</div>{selected.length === 3 && !isValidSpecialties(selected, suggestions) ? <ErrorBanner>Escolha pelo menos duas sugestões da classe.</ErrorBanner> : null}</>
}

function VisualStep({
  classKey,
  colors,
  defaults,
  setColor,
  resetColor,
  resetAll,
  onDefaultsLoaded,
}: {
  classKey: ClassKey
  colors: Record<string, string>
  defaults: Record<string, string>
  setColor: (key: string, value: string) => void
  resetColor: (key: string) => void
  resetAll: () => void
  onDefaultsLoaded: (defaults: Record<string, string>) => void
}) {
  const schema = characterColorSchemas[classKey]
  return (
    <>
      <CreationStepHeader step={5} title="Defina a apresentação visual"><p>A arte da classe recebe as cores escolhidas aqui, camada por camada. Sombras são calculadas automaticamente a partir da cor principal.</p></CreationStepHeader>
      <div className="visual-builder">
        <div className="visual-builder__preview creation-preview-stack">
          <EditableCharacterArtwork classKey={classKey} colors={colors} onDefaultsLoaded={onDefaultsLoaded} />
        </div>
        <div className="visual-controls">
          <button type="button" className="visual-controls__reset-all" onClick={resetAll}>Restaurar todas as cores padrão</button>
          <div className="color-layer-grid">
            {schema.map((layer) => (
              <ColorLayerControl
                key={layer.key}
                layer={layer}
                value={colors[layer.key] ?? defaults[layer.key] ?? '#808080'}
                isCustom={layer.key in colors}
                onChange={(value) => setColor(layer.key, value)}
                onReset={() => resetColor(layer.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function ColorLayerControl({ layer, value, isCustom, onChange, onReset }: { layer: ColorLayer; value: string; isCustom: boolean; onChange: (value: string) => void; onReset: () => void }) {
  const suggestions = ['#b97850', '#974f40', '#b79a5c', '#687650', '#56728f', '#3f354f']
  return (
    <div className="color-layer-control">
      <span className="color-layer-control__label">{layer.label}</span>
      <span className="color-layer-control__swatch" style={{ backgroundColor: value }} aria-hidden="true" />
      <div className="color-layer-control__suggestions" aria-label={`Sugestões de cor para ${layer.label}`}>
        {suggestions.map((suggestion) => <button key={suggestion} type="button" className={value.toLowerCase() === suggestion ? 'is-active' : ''} style={{ backgroundColor: suggestion }} aria-label={`Usar ${suggestion} em ${layer.label}`} aria-pressed={value.toLowerCase() === suggestion} onClick={() => onChange(suggestion)} />)}
      </div>
      <label className="color-layer-control__custom"><span>Personalizado</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Cor de ${layer.label}`} /></label>
      <input
        type="text"
        className="color-layer-control__hex"
        key={value}
        defaultValue={value}
        maxLength={7}
        aria-label={`Valor hexadecimal de ${layer.label}`}
        onBlur={(event) => {
          const next = event.target.value
          if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next)
          else event.target.value = value
        }}
      />
      <button type="button" className="color-layer-control__reset" onClick={onReset} disabled={!isCustom}>Restaurar padrão</button>
    </div>
  )
}

function Derived({ derived, resourceLabel }: { derived: ReturnType<typeof calculateDerived>; resourceLabel: string }) {
  return <dl className="derived-strip" aria-label="Valores calculados em tempo real"><div><dt><Icon name="vitalidade" size={18} decorative />Vitalidade</dt><dd>{derived.vitality}</dd></div><div><dt><Icon name="defesa" size={18} decorative />Defesa</dt><dd>{derived.defense}</dd></div><div><dt><Icon name="inventario" size={18} decorative />Inventário</dt><dd>{derived.inventoryCapacity}</dd></div><div><dt><Icon name="recurso-de-classe" size={18} decorative />{resourceLabel}</dt><dd>{derived.resource}</dd></div></dl>
}

function Review({ input, colors, derived }: { input: IdentityForm & { bond: string; classKey: ClassKey; attributes: Attributes; specialties: Specialty[] }; colors: Record<string, string>; derived: ReturnType<typeof calculateDerived> }) {
  const schema = characterColorSchemas[input.classKey]
  return (
    <>
      <CreationStepHeader step={6} title="Revise antes de criar"><p>Confira identidade, escolhas mecânicas e visual. Nenhum dado foi gravado ainda.</p></CreationStepHeader>
      <CharacterReview input={input} colors={colors} derived={derived} />
      <ul className="visual-summary" aria-label="Resumo das cores escolhidas">
        {schema.map((layer) => (
          <li key={layer.key}>
            <span className="visual-summary__swatch" style={{ backgroundColor: colors[layer.key] ?? '#808080' }} aria-hidden="true" />
            {layer.label}
          </li>
        ))}
      </ul>
    </>
  )
}

function attributeIcon(attribute: keyof Attributes) {
  return ({ strength: 'forca', agility: 'agilidade', intellect: 'intelecto', presence: 'presenca', instinct: 'instinto' } as const)[attribute]
}
