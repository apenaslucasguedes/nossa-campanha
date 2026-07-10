# Arquitetura

## Escopo dos Marcos 1 e 2

SPA estática hospedada no GitHub Pages. React cuida da interface; Supabase fornece autenticação, Postgres com RLS e Realtime. O cliente nunca recebe privilégios administrativos. Rotas autenticadas vivem sob um único shell; `/login` é pública e não contém cadastro.

## Camadas

- `src/pages` e `src/components`: apresentação, estados de carregamento/erro/vazio e controles acessíveis.
- `src/data`: consultas e mutações Supabase, sem regras de jogo.
- `src/game-data`: regras puras e futuras configurações TypeScript das seis classes.
- `src/types`: contratos correspondentes ao schema público.
- `supabase/migrations`: schema, constraints, índices, RLS e publicação Realtime.

`character_states` mantém os valores mutáveis separados da identidade do personagem; `character_conditions` permite uma lista normalizada e eventos Realtime granulares. Dano e cura são limitados no cliente para resposta imediata e novamente pelo banco via constraints. A autorização visual melhora a UX, mas a fronteira de segurança real é a RLS.

## Rotas e deploy

`HashRouter` evita rewrites inexistentes no GitHub Pages. `base: './'` torna os assets relativos e elimina dependência do slug do repositório. O workflow só publica após lint, typecheck, testes e build.

## Limites deliberados

Criação completa, regras das classes, inventário, progressão, mapa final e combate automático ficam fora destes marcos. Placeholders dizem isso explicitamente e nenhum dado simulado é mostrado como real.
