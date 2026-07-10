# Guia de manutenção

- Stack: React 19, TypeScript estrito, Vite, React Router com `HashRouter`, Supabase e CSS próprio.
- Comandos: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Componentes não acessam Supabase diretamente: consultas ficam em `src/data`; regras mecânicas ficam em `src/game-data`; tipos do banco ficam em `src/types`.
- Use componentes reutilizáveis, HTML semântico, foco visível, contraste adequado, mobile first e suporte a movimento reduzido. Não adicione Tailwind ou biblioteca visual pesada.
- Nunca grave `.env`, credenciais, UUIDs pessoais, secret/service-role keys. O frontend usa somente a publishable key e todas as tabelas expostas devem ter RLS de privilégio mínimo.
- Migrações são aditivas, versionadas e nunca aplicadas remotamente sem autorização. Não apresente mocks como dados reais.
- O produto é uma ficha/painel mecânico para dois jogadores; não narra, não automatiza combate e não substitui o GPT Mestre.
- Antes de commit: lint, typecheck, testes e build devem passar. Deploy somente por GitHub Pages.
