# Configuração manual do GPT Mestre

Esta etapa apenas prepara arquivos. Não aplica migração, não implanta funções e não configura ou publica um GPT.

## Bloqueio de autenticação

As quatro funções exigem `Authorization: Bearer <JWT de usuário>` válido. A configuração manual comum do editor de GPTs pode não conseguir obter e renovar o JWT dinâmico do usuário do Relicário. A anon key não autentica um usuário e não deve ser tratada assim. Não coloque `service_role`, senha, segredo administrativo ou token pessoal fixo no GPT.

Antes do uso real, valide uma configuração compatível. Se o editor não suportar diretamente esse fluxo, implemente futuramente uma camada OAuth própria ou intermediária autorizada que identifique o usuário, emita/encaminhe credenciais de curta duração e preserve RLS e privilégio mínimo. Essa arquitetura não faz parte desta etapa.

## Checklist

1. Revisar `202607130002_gpt_api_actions.sql` e aplicá-la somente em etapa autorizada.
2. Implantar `campaign-state`, `table-state`, `world-state` e `apply-game-action` em etapa autorizada.
3. Confirmar `SUPABASE_URL` e `SUPABASE_ANON_KEY` no ambiente das funções; definir `GPT_API_ALLOWED_ORIGINS` apenas se necessário e com origens conhecidas.
4. Substituir literalmente `SEU_PROJECT_REF` em `openapi.yaml` pelo project ref correto.
5. Abrir o editor de GPTs.
6. Criar o GPT Mestre, sem publicá-lo.
7. Colar o conteúdo de `GPT_MASTER_INSTRUCTIONS.md` em Instructions.
8. Adicionar uma Action.
9. Importar `openapi.yaml` e confirmar as quatro operações.
10. Configurar autenticação compatível com JWT dinâmico de usuário; interromper se isso não puder ser feito com segurança.
11. Testar `campaign-state`, `table-state` e `world-state` com usuário membro e observar os erros esperados.
12. Como `table_admin`, testar uma única escrita controlada e reversível no ambiente apropriado.
13. Repetir exatamente o mesmo `request_id` e confirmar que o efeito não é aplicado duas vezes; depois usar UUID novo para outra ação.
14. Revisar permissões, RLS, dados expostos, política de privacidade e compartilhamento antes de publicar ou compartilhar o GPT.

## Roteiro de testes manuais

- Sem Authorization: esperar `UNAUTHENTICATED`.
- Usuário fora da campanha: esperar `CAMPAIGN_NOT_FOUND`.
- Jogador em leitura: esperar sucesso.
- Jogador em escrita: esperar `FORBIDDEN`.
- Administrador em escrita válida: conferir `ok`, `action_id`, `summary` e resultado.
- UUID ou ação inválida: esperar `INVALID_ACTION`.
- Alvo de outra campanha ou inexistente: esperar `INVALID_TARGET` sem vazamento de dados.
- Valor fora dos limites: esperar `LIMIT_EXCEEDED`.
- Estado concorrente: esperar `CONFLICT`, consultar novamente e não repetir cegamente.
- Migração ausente: esperar `MIGRATION_REQUIRED` e nenhuma alegação de persistência.
- Repetição do mesmo `request_id`: confirmar idempotência e ausência de efeito duplicado.
- Mundo sem persistência: confirmar que nenhum catálogo estático é apresentado como revelado.

## Limitações atuais

- `world-state` retorna `MIGRATION_REQUIRED` até existir persistência por campanha para regiões e locais revelados.
- Não existe ação para revelar local.
- Somente `table_admin` escreve; membros apenas leem.
- A API expõe estado mecânico, não memória narrativa completa.
- A integração real depende de autenticação dinâmica segura ainda não resolvida no editor de GPTs.
- Configuração, implantação, migração e publicação permanecem manuais e fora desta entrega.
O schema também expõe `requestDicePool`, autenticada pela mesma `X-Relicario-Key` e pela permissão `request_roll`.
