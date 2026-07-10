# Configuração manual do Supabase

## 1. Projeto e autenticação

1. Crie um projeto Supabase e mantenha **Confirm email** conforme a política da mesa.
2. Em Authentication, desative novos cadastros públicos. Crie exatamente os dois usuários por **Users → Add user**, com e-mail e senha temporária segura.
3. Copie `.env.example` para `.env.local` e use apenas a Project URL e a publishable key. Nunca use `service_role`/secret key no frontend.

## 2. Banco

No SQL Editor, execute em ordem os arquivos de `supabase/migrations`. A migração inicial cria tabelas, constraints, índices, funções auxiliares, RLS e Realtime. Este repositório não aplica migrações remotamente automaticamente.

## 3. Bootstrap dos dois usuários

1. Copie os UUIDs dos dois usuários em Authentication → Users.
2. Abra `supabase/BOOTSTRAP.sql` no SQL Editor sem modificar o arquivo versionado.
3. Substitua os marcadores `<UUID_USUARIO_1>`, `<UUID_USUARIO_2>`, nomes e campanha apenas no editor e execute.
4. O usuário do assento 1 recebe `table_admin`; o assento 2 recebe `player`.
5. Não insira personagens por SQL. Após aplicar a migração do Marco 3, cada jogador cria a própria ficha em `/criar-personagem`.

## 4. Realtime e validação

A migração adiciona `character_states` e `character_conditions` à publicação `supabase_realtime`. Entre em dois navegadores, altere dano/condição como `table_admin` e confirme atualização no outro. Confirme também que o jogador comum não consegue alterar o personagem alheio nem membros/campanha.

Valide também que cada usuário cria somente o próprio personagem, que uma segunda criação falha e que personagem, estado e três especialidades aparecem juntos. Aplique `202607100002_character_creation.sql` manualmente depois da migração inicial; o repositório não executa migrações remotas.

## 5. GitHub Pages

Crie os secrets de Actions `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Adicione a URL publicada em Authentication → URL Configuration → Redirect URLs. Como a sessão usa senha e HashRouter, não há callback social.
