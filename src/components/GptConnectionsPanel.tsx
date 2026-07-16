import { useEffect, useState } from 'react'
import { createGptConnection, listGptConnections, revokeGptConnection } from '../data/gptConnections'
import type { GptCampaignConnection, GptCampaignConnectionCreated } from '../types/database'
import { buildGptActionUrl } from '../lib/gptActionUrls'
import { Icon } from './Icon'

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Nunca'
}

export function GptConnectionsPanel({ campaignId }: { campaignId: string }) {
  const [connections, setConnections] = useState<GptCampaignConnection[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdConnection, setCreatedConnection] = useState<GptCampaignConnectionCreated | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const snapshotActionUrl = buildGptActionUrl('campaign-snapshot', import.meta.env.VITE_SUPABASE_URL)
  const rollActionUrl = buildGptActionUrl('request-dice-roll', import.meta.env.VITE_SUPABASE_URL)

  async function load() {
    setLoading(true); setError(null)
    try {
      const data = await listGptConnections(campaignId)
      setConnections(data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as conexões.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCreatedConnection(null)
    setCopyState('idle')
    void load()
    return () => { setCreatedConnection(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  async function createConnection() {
    const clean = label.trim()
    if (!clean) return
    setCreating(true); setError(null)
    try {
      const created = await createGptConnection(campaignId, clean)
      setCreatedConnection(created)
      setLabel('')
      setCopyState('idle')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a conexão.')
    } finally {
      setCreating(false)
    }
  }

  async function copyRawKey() {
    if (!createdConnection) return
    try {
      await navigator.clipboard.writeText(createdConnection.raw_key)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  function dismissCreated() {
    setCreatedConnection(null)
    setCopyState('idle')
  }

  async function revoke(connectionId: string) {
    if (!window.confirm('Revogar esta conexão? O GPT deixará de conseguir usá-la imediatamente.')) return
    setRevokingId(connectionId); setError(null)
    try {
      await revokeGptConnection(connectionId)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível revogar a conexão.')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section className="campaign-panel campaign-gpt-connections" aria-labelledby="campaign-gpt-connections-title">
      <div className="section-heading">
        <Icon name="compendio" size={24} decorative />
        <div>
          <h2 id="campaign-gpt-connections-title">Conectar GPT Mestre</h2>
          <p>Chave de conexão com permissões fixas: leitura do snapshot e solicitação de rolagens.</p>
        </div>
      </div>

      <div className="campaign-inline-actions">
        <label className="gpt-connection-label-field">
          Nome da conexão
          <input value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} placeholder="Ex.: GPT Mestre principal" disabled={creating} />
        </label>
        <button className="card-action" type="button" disabled={creating || !label.trim()} onClick={() => void createConnection()}>
          {creating ? 'Criando...' : 'Criar conexão'}
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {createdConnection ? (
        <div className="gpt-connection-reveal" role="alert">
          <p className="form-note">Chave criada para "{createdConnection.label}". Copie agora: ela não poderá ser exibida novamente.</p>
          <code>{createdConnection.raw_key}</code>
          <div className="campaign-inline-actions">
            <button className="card-action" type="button" onClick={() => void copyRawKey()}>Copiar chave</button>
            <button className="card-action card-action--quiet" type="button" onClick={dismissCreated}>Já copiei, fechar aviso</button>
          </div>
          {copyState === 'copied' ? <p className="form-note">Chave copiada.</p> : null}
          {copyState === 'error' ? <p className="form-error">Não foi possível copiar neste navegador.</p> : null}
        </div>
      ) : null}

      {loading ? <p className="compact-empty">Carregando conexões...</p> : null}
      {!loading && connections && connections.length === 0 ? <p className="compact-empty">Nenhuma conexão criada ainda.</p> : null}

      {!loading && connections && connections.length > 0 ? (
        <ul className="revealed-location-list">
          {connections.map((connection) => (
            <li key={connection.id}>
              <div>
                <strong>{connection.label}</strong>
                <span>{connection.revoked_at ? 'Revogada' : 'Ativa'} · Criada em {formatDate(connection.created_at)} · Último uso: {formatDate(connection.last_used_at)}</span>
              </div>
              {!connection.revoked_at ? (
                <button className="card-action card-action--quiet danger-button" type="button" disabled={revokingId === connection.id} onClick={() => void revoke(connection.id)}>
                  {revokingId === connection.id ? 'Revogando...' : 'Revogar'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="gpt-connection-urls">
        {snapshotActionUrl && rollActionUrl ? (
          <>
            <p className="form-note">Cole a chave criada acima na configuração do GPT, usando estas URLs de Action:</p>
            <dl>
              <div><dt>getCampaignSnapshot</dt><dd>{snapshotActionUrl}</dd></div>
              <div><dt>requestDiceRoll</dt><dd>{rollActionUrl}</dd></div>
            </dl>
          </>
        ) : (
          <p className="form-error">Configuração ausente: defina VITE_SUPABASE_URL para gerar as URLs de Action.</p>
        )}
      </div>
    </section>
  )
}
