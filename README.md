# Relicário — apoio de mesa para dois

Interface responsiva de ficha, painel e controles mecânicos para uma campanha de RPG com dois jogadores. Não gera narrativa e não substitui o GPT Mestre.

## Instalação e desenvolvimento

Requer Node.js 22+ e npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env.local`. O acesso é apenas por e-mail e senha; usuários são criados manualmente no Supabase, sem cadastro público.

## Qualidade e build

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

O Vite usa `base: './'` e o app usa `HashRouter`, portanto o build funciona sob qualquer nome/caminho de repositório no GitHub Pages.

## Deploy no GitHub Pages

1. No GitHub, configure os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Em **Settings → Pages**, escolha **GitHub Actions** como origem.
3. Envie a branch `main`. O workflow valida e publica `dist` exclusivamente no GitHub Pages.

Não há configuração para Vercel, PWA ou backend Node. Veja [docs/SETUP_SUPABASE.md](docs/SETUP_SUPABASE.md) antes do primeiro acesso e [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para decisões técnicas.
