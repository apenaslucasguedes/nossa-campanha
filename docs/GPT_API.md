# API segura para o GPT Mestre (etapa 8A)

Esta camada expõe somente estado mecânico e ações fechadas do Relicário. Ela não configura GPT Actions, não publica OpenAPI externo e não oferece chat.

## Autenticação e autorização

Todas as chamadas usam `Authorization: Bearer <JWT do usuário>` e identificam a campanha com `campaign_id`. A função valida o JWT com o Supabase Auth e consulta `campaign_members` usando o próprio token. Não há `service_role`.

- Membros (`player` e `table_admin`) podem usar os endpoints de leitura.
- Somente `table_admin` pode usar `apply-game-action`.
- RLS continua ativa em todas as consultas e alterações.
- As respostas não incluem e-mail, tokens, chaves, atributos narrativos privados ou usuários de outras campanhas.

Todos os endpoints aceitam `POST` e `OPTIONS`. Configure `GPT_API_ALLOWED_ORIGINS` como uma lista separada por vírgulas apenas se um cliente em navegador precisar chamar as funções. Chamadas servidor a servidor não precisam de CORS.

## Endpoints

### `campaign-state`

Retorna identificação da campanha, papel atual, membros sem identidade/e-mail, personagens e resumo mecânico. `current_region` permanece `null` enquanto não houver persistência de mundo por campanha.

### `table-state`

Retorna Vitalidade, recurso e condições dos personagens, além do combate ativo, inimigos, iniciativa, rodada e turno. Retorna `MIGRATION_REQUIRED` se a migração de combate não estiver instalada.

### `world-state`

Valida autenticação e membership, mas atualmente retorna `MIGRATION_REQUIRED`. O mapa atual é um catálogo estático e não existe tabela que registre regiões conhecidas ou locais revelados por campanha. A função deliberadamente não apresenta o catálogo inteiro como se estivesse revelado.

### `apply-game-action`

Exige `table_admin`, `request_id` UUID e uma ação da união fechada:

- `apply_damage`, em personagem ou inimigo;
- `apply_healing`, em personagem;
- `spend_resource` e `restore_resource`, com o nome correto do recurso da classe;
- `add_condition` e `remove_condition`, limitadas a Ferido, Exausto, Amedrontado, Envenenado, Imobilizado, Desorientado, Corrompido e Caído;
- `start_combat`, `end_combat`, `advance_turn` e `advance_round`;
- `create_enemy`, `update_enemy` e `defeat_enemy`.

`reveal_location` não está disponível porque ainda não há estrutura real de revelação. Não são aceitos nomes de tabela, SQL, atributos-base, classe ou conteúdo narrativo.

## Exemplos

Requisição de leitura:

```json
{
  "campaign_id": "11111111-1111-4111-8111-111111111111"
}
```

Requisição de dano:

```json
{
  "campaign_id": "11111111-1111-4111-8111-111111111111",
  "request_id": "22222222-2222-4222-8222-222222222222",
  "action": {
    "type": "apply_damage",
    "target_kind": "character",
    "target_id": "33333333-3333-4333-8333-333333333333",
    "amount": 4
  }
}
```

Resposta de sucesso:

```json
{
  "ok": true,
  "data": {
    "target_kind": "character",
    "character_id": "33333333-3333-4333-8333-333333333333",
    "vitality_before": 12,
    "vitality_after": 8,
    "vitality_max": 12
  },
  "action_id": "44444444-4444-4444-8444-444444444444",
  "summary": "Personagem sofreu 4 de dano."
}
```

Resposta de erro:

```json
{
  "ok": false,
  "code": "FORBIDDEN",
  "message": "Você não tem permissão para esta operação."
}
```

## Idempotência e auditoria

A migração `202607130002_gpt_api_actions.sql` amplia `game_actions` com `request_id` e `result`, cria unicidade por campanha e implementa `apply_game_action_v1`. A RPC usa bloqueio transacional para que repetições concorrentes retornem a ação já registrada sem aplicar o efeito novamente. Cada ação registra campanha, usuário autenticado, tipo, resultado, resumo e horário.

## Erros estáveis

`UNAUTHENTICATED`, `FORBIDDEN`, `CAMPAIGN_NOT_FOUND`, `INVALID_ACTION`, `INVALID_TARGET`, `LIMIT_EXCEEDED`, `CONFLICT` e `MIGRATION_REQUIRED`. Stack traces e erros brutos do banco não são devolvidos.

## Configuração manual pendente

1. Revisar e aplicar local/remotamente a nova migração em uma etapa autorizada. Esta entrega não aplica migrações.
2. Implantar as quatro Edge Functions em uma etapa futura. Esta entrega não faz deploy.
3. Definir `GPT_API_ALLOWED_ORIGINS` somente quando houver uma origem web conhecida.
4. Manter `SUPABASE_URL` e `SUPABASE_ANON_KEY`, fornecidas pelo ambiente das Edge Functions. Não adicionar `service_role`.
5. Criar uma migração futura para regiões/locais revelados antes de habilitar `world-state` ou `reveal_location`.
