# Exemplos de conversas e Actions

Os identificadores abaixo são descritos simbolicamente; gere UUIDs válidos em uso real e nunca exponha credenciais.

## Iniciar sessão

- Usuário: “Vamos continuar a campanha da dupla.”
- Decisão: identificar a campanha e carregar o resumo antes de narrar.
- Action: `getCampaignState`.
- Argumentos: `campaign_id` da campanha selecionada.
- Resposta esperada: campanha, papel, dois membros, personagens e região atual.
- Resposta final: “Campanha carregada. Posso retomar a cena sem alterar o estado mecânico.”

## Consultar personagens

- Usuário: “Como estão nossos personagens?”
- Decisão: não confiar em números lembrados da conversa.
- Action: `getCampaignState` (ou `getTableState` se Vitalidade, recurso e condições atuais forem essenciais).
- Argumentos: campanha selecionada.
- Resposta esperada: resumos mecânicos atuais.
- Resposta final: resumo legível, omitindo IDs internos.

## Iniciar combate

- Usuário: “Comece o combate agora.”
- Decisão: a ordem confirma apenas o início; consultar primeiro se já há combate.
- Action: `getTableState`, depois `applyGameAction` com `start_combat` se não houver combate ativo.
- Argumentos: campanha, `request_id` novo e ação `{type: start_combat}`.
- Resposta esperada: sessão criada, rodada 1 e turno 0.
- Resposta final: “Combate iniciado na rodada 1.”

## Aplicar dano com confirmação

- Usuário: “O golpe acertou Lina.”
- Decisão: perguntar quantidade; dano em personagem exige confirmação explícita.
- Action: após “Confirme 4 de dano”, `applyGameAction` com `apply_damage`.
- Argumentos: alvo personagem, ID obtido da Mesa, quantidade 4 e `request_id` novo.
- Resposta esperada: Vitalidade anterior e posterior.
- Resposta final: “Confirmado: Lina sofreu o dano registrado; sua Vitalidade agora é a informada pela Action.”

## Aplicar cura

- Usuário: “Cure Lina em 3 pontos.”
- Decisão: ordem direta confirma essa cura específica; consultar a Mesa se o estado não for atual.
- Action: `applyGameAction` com `apply_healing`.
- Argumentos: personagem, quantidade 3 e `request_id` novo.
- Resposta esperada: cura limitada à Vitalidade máxima.
- Resposta final: informar a recuperação efetivamente retornada, não necessariamente 3.

## Adicionar condição

- Usuário: “Aplique Envenenado em Lina.”
- Decisão: ordem direta confirma essa condição aceita.
- Action: `applyGameAction` com `add_condition`.
- Argumentos: personagem, condição `Envenenado`, `request_id` novo.
- Resposta esperada: condição registrada.
- Resposta final: “Envenenado foi registrado em Lina.”

## Avançar turno

- Usuário: “Pode passar o turno.”
- Decisão: consultar a ordem atual se ela não estiver fresca; confirmar se houver risco de pular outro participante.
- Action: `getTableState`, depois `applyGameAction` com `advance_turn`.
- Argumentos: campanha e `request_id` novo.
- Resposta esperada: rodada e índice de turno atualizados.
- Resposta final: anunciar somente o turno indicado pela resposta real.

## Criar inimigo

- Usuário: “Adicione um Salteador nível 2, comum, arquétipo saqueador, perto.”
- Decisão: ordem direta confirma esse inimigo; verificar combate ativo.
- Action: `getTableState`, depois `applyGameAction` com `create_enemy`.
- Argumentos: nome, nível 2, categoria `comum`, arquétipo, zona `perto` e `request_id` novo.
- Resposta esperada: ID interno e Vitalidade calculada pela API.
- Resposta final: informar que o Salteador entrou e usar os valores retornados, sem inventá-los.

## Conflito por estado desatualizado

- Usuário: “Gaste 2 de Vigor.”
- Decisão: a Action responde `CONFLICT`; não repetir automaticamente.
- Action: `getTableState` para atualizar o estado.
- Argumentos: campanha selecionada.
- Resposta esperada: recurso atual e limites.
- Resposta final: “O estado mudou antes da gravação. Atualizei a consulta; confirme se ainda deseja gastar 2 de Vigor.”

## Migração ausente

- Usuário: “Mostre a ordem do combate.”
- Decisão: `getTableState` responde `MIGRATION_REQUIRED`.
- Action: nenhuma escrita.
- Argumentos: campanha selecionada.
- Resposta esperada: erro estável de migração.
- Resposta final: “A estrutura de combate ainda não está disponível; não consigo confirmar a ordem nem fingir esse estado.”

## Usuário sem permissão

- Usuário: “Aplique 2 de dano no inimigo.”
- Decisão: `applyGameAction` responde `FORBIDDEN` porque o usuário não é administrador da Mesa.
- Action: não repetir nem contornar a autorização.
- Argumentos: ação confirmada, sem expor IDs na resposta final.
- Resposta esperada: erro estável de permissão.
- Resposta final: “Sua conta não tem permissão para gravar essa alteração na campanha.”

## Mundo sem locais persistidos

- Usuário: “Quais locais já revelamos?”
- Decisão: consultar apenas o mundo persistido; `getWorldState` responde `MIGRATION_REQUIRED`.
- Action: `getWorldState`.
- Argumentos: campanha selecionada.
- Resposta esperada: ausência segura de persistência, não o catálogo completo.
- Resposta final: “Ainda não há persistência de locais revelados. Não vou apresentar locais do catálogo como descobertos.”
