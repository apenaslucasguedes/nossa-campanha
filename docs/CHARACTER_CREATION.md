# Criação de personagem — Marco 3

## Fluxo

O jogador autenticado percorre sete etapas: classe, atributos, identidade, vínculo, especialidades, visual e revisão. Nada é gravado antes da confirmação final. Se já existir um personagem do usuário na campanha, a rota redireciona para a ficha existente.

As classes são Guerreiro, Arcanista, Lâmina Sombria, Necromante, Bardo e Druida. Suas funções, atributos principais, recursos, matrizes sugeridas e habilidades de nível 1 ficam em `src/game-data/classes.ts`. A distribuição inicial usa exatamente `3, 2, 1, 1, 0`, soma 7 e máximo 3. São escolhidas três especialidades únicas, com pelo menos duas entre as sugestões da classe.

## Armazenamento e segurança

A migração `202607100002_character_creation.sql` adiciona identidade narrativa, atributos, valores derivados, avatar provisório e `character_specialties`. A função `create_my_character(jsonb)` usa `auth.uid()`, encontra a campanha do usuário e valida novamente classe, distribuição e especialidades. Personagem, estado inicial e especialidades são inseridos na mesma transação da chamada; qualquer falha desfaz tudo.

A chave única `(campaign_id, owner_id)` continua impedindo duplicidade. A RLS de `characters` permite criação e edição somente quando `owner_id = auth.uid()`. O administrador conserva controle apenas dos estados mecânicos e condições conforme as políticas anteriores. O frontend usa a publishable key, nunca `service_role`.

## Campos provisórios

O avatar é uma silhueta SVG substituível e guarda apresentação, cores e acessório em JSON. Capacidade de inventário é calculada, mas inventário funcional não faz parte deste marco. Habilidades são textos de referência de nível 1; progressão dos níveis 2 a 5 ainda não está implementada.
