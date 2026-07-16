# API do GPT Mestre

## Fase 1 — conexão por chave de campanha (etapa atual)

A conexão real com o GPT Mestre usa duas Edge Functions e uma chave de conexão vinculada a exatamente uma campanha, nunca a um usuário. A configuração manual está preparada em [`gpt-actions/openapi.yaml`](gpt-actions/openapi.yaml) e [`gpt-actions/GPT_MASTER_INSTRUCTIONS.md`](gpt-actions/GPT_MASTER_INSTRUCTIONS.md). Esta entrega não aplica a migração, não implanta as funções e não configura ou publica um GPT.

### Autenticação

Todas as chamadas usam o cabeçalho `X-Relicario-Key: <chave>`, nunca `Authorization: Bearer`, nunca a anon key, nunca a service_role, nunca uma senha. A chave:

- é gerada pela RPC `create_gpt_campaign_connection(target_campaign, connection_label, connection_permissions)`, chamada pelo administrador da campanha autenticado normalmente (JWT de usuário);
- é devolvida em texto puro **uma única vez**, no retorno dessa RPC; o banco armazena somente `sha256(chave)` em `gpt_campaign_connections.key_hash`;
- fica vinculada a exatamente uma campanha e a um conjunto fechado de permissões: `read_snapshot` e/ou `request_roll`;
- pode ser revogada a qualquer momento pelo administrador via `revoke_gpt_campaign_connection(connection_id)`, que marca `revoked_at` (a chave nunca é apagada, só desativada);
- é validada, a cada chamada, pela RPC interna `authenticate_gpt_key(key_hash, required_permission)`, chamada pelas Edge Functions com a `anon key` do projeto (não com credenciais do usuário) — essa RPC é a única porta de entrada e nunca libera consulta arbitrária: devolve apenas `campaign_id` e o usuário que criou a chave, e só quando a chave existe, não está revogada e tem a permissão exigida.

### Endpoints desta fase

#### `campaign-snapshot` (`getCampaignSnapshot`)

Sem corpo obrigatório. Retorna o snapshot completo da campanha vinculada à chave, produzido pela RPC `get_campaign_snapshot_for_gpt`, que reaproveita exatamente a mesma função interna (`_campaign_snapshot_payload`) usada pela RPC `get_campaign_snapshot` já existente para o app — não existem dois formatos de snapshot divergentes. Inclui: contexto narrativo e `current_region_id` da campanha, locais revelados, sessão ativa, personagens com estado mecânico (Vitalidade, recurso, condições, especialidades), combate ativo (com participantes e inimigos), solicitações de rolagem pendentes, rolagens recentes e eventos recentes (sempre excluindo eventos de teste e arquivados).

#### `request-dice-roll` (`requestDiceRoll`)

Recebe `character_id` e `attribute` e/ou `specialty`, mais `modifier`, `reason` e `difficulty` opcionais. Chama exclusivamente a RPC `request_dice_roll_for_gpt`, que reaproveita o mesmo núcleo de escrita (`_create_roll_request`) usado pela RPC `request_dice_roll` já existente para o administrador logado no site. **Esta Action nunca chama `perform_dice_roll`** — a rolagem em si continua sendo feita exclusivamente pelo jogador, clicando nos dados no site; o GPT só pode pedir o teste.

### Erros estáveis

`UNAUTHENTICATED`, `FORBIDDEN`, `CAMPAIGN_NOT_FOUND`, `INVALID_ACTION`, `INVALID_TARGET`, `LIMIT_EXCEEDED`, `CONFLICT`, `MIGRATION_REQUIRED` — o mesmo conjunto fechado usado pelo restante da API. Chave ausente, inexistente ou revogada respondem `UNAUTHENTICATED` (deliberadamente sem distinguir o motivo, para não criar um oráculo de revogação); chave sem a permissão exigida ou pedido de rolagem para uma campanha diferente da vinculada à chave respondem `FORBIDDEN`; personagem que não pertence à campanha da chave responde `INVALID_TARGET`; ausência de sessão ativa responde `CONFLICT`.

### Migrations desta fase

- `202607160003_gpt_campaign_connections.sql` — aditiva, cria `gpt_campaign_connections`, as RPCs de gestão/validação de chave e as RPCs `_for_gpt` que reaproveitam `get_campaign_snapshot`/`request_dice_roll`. Ainda não aplicada remotamente.

### Fora do escopo desta fase

- `applyGameAction` não está disponível para esta chave — nenhuma escrita mecânica (dano, cura, recurso, condição, combate) acontece pelo GPT nesta etapa.
- Não há RPC/Action para revelar local, criar campanha ou gerenciar sessões pelo GPT.
- Não há UI no Relicário para criar/revogar a chave nesta etapa; as RPCs existem e estão prontas, mas o painel de administração fica para uma etapa futura.

## Legado — API por JWT de usuário (etapa 8A/8B)

As quatro funções abaixo continuam existindo no repositório por compatibilidade, mas **não fazem parte da conexão da fase 1** e não são chamadas pela chave `X-Relicario-Key`. Elas usam `Authorization: Bearer <JWT do usuário>` e identificam a campanha com `campaign_id` no corpo. Consulte [`gpt-actions/SETUP.md`](gpt-actions/SETUP.md) e [`gpt-actions/EXAMPLES.md`](gpt-actions/EXAMPLES.md) para o roteiro original — esses dois arquivos ainda descrevem somente o fluxo legado por JWT e não foram atualizados nesta etapa.

- `campaign-state` — superada por `campaign-snapshot`; ainda devolve `current_region: null` fixo e não inclui contexto narrativo nem sessão.
- `table-state` — superada por `campaign-snapshot`; não inclui sessões, `roll_requests` nem `dice_rolls`.
- `world-state` — ainda responde `MIGRATION_REQUIRED` de forma incondicional, apesar de `campaign_locations`/`current_region_id` já existirem desde `202607160001_campaign_context.sql`.
- `apply-game-action` — continua funcional e inalterada (`apply_game_action_v1`); é a única forma de escrita mecânica automatizada, mas exige o JWT de um `table_admin`, não a chave do GPT.

Nenhum desses quatro contratos foi ampliado nesta etapa, para não manter três formatos paralelos de estado de campanha.
