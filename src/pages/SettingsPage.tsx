import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { ErrorBanner, LoadingState, PageHeader } from '../components/States'
import { getGptMasterUrl, updateGptMasterUrl } from '../data/campaigns'

function validOptionalUrl(value: string) {
  if (!value.trim()) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function SettingsPage() {
  const { session } = useAuth()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!session?.user.id) return
      try {
        const value = await getGptMasterUrl(session.user.id)
        if (active) setUrl(value ?? '')
      } catch {
        if (active) setError('Nao foi possivel carregar as configuracoes.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [session?.user.id])

  async function save() {
    if (!session?.user.id || !validOptionalUrl(url)) return
    setSaving(true); setMessage(null); setError(null)
    try {
      await updateGptMasterUrl(session.user.id, url.trim() || null)
      setMessage('Configuracao salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />
  const invalid = !validOptionalUrl(url)
  return (
    <div className="settings-page">
      <PageHeader eyebrow="Preferencias" title="Configuracoes">Ajustes pessoais da experiencia do Relicario.</PageHeader>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {message ? <div className="action-toast" role="status">{message}</div> : null}
      <section className="campaign-panel settings-panel" aria-labelledby="gpt-master-url-title">
        <div className="section-heading">
          <Icon name="compendio" size={24} decorative />
          <div>
            <h2 id="gpt-master-url-title">URL do GPT Mestre</h2>
            <p>Endereco opcional para abrir manualmente em uma nova aba. Nao e segredo e nao envia dados automaticamente.</p>
          </div>
        </div>
        <label className="settings-field">
          URL do GPT Mestre
          <input aria-label="Endereco do GPT Mestre" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://chatgpt.com/g/..." inputMode="url" />
        </label>
        {invalid ? <p className="form-error">Informe uma URL iniciada por http:// ou https://, ou deixe em branco.</p> : <p className="form-note">O pacote da campanha continua sendo baixado ou copiado manualmente.</p>}
        <button className="card-action" type="button" disabled={saving || invalid} onClick={() => void save()}>Salvar URL</button>
      </section>
    </div>
  )
}
