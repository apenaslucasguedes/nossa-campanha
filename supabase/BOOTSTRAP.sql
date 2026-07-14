-- Modelo de bootstrap intencionalmente não executável.
--
-- Para preparar um ambiente novo, crie primeiro os usuários pelo fluxo normal de
-- autenticação e confirme conscientemente os identificadores no painel do Supabase.
-- Depois copie o exemplo abaixo para o editor SQL, substitua todos os placeholders
-- e remova os comentários somente durante essa execução manual.
--
-- Nenhum dado é criado automaticamente ao executar este arquivo sem edição.

/*
begin;

insert into public.profiles (id, display_name) values
  ('<UUID_TABLE_ADMIN>'::uuid, '<NOME_TABLE_ADMIN>'),
  ('<UUID_PLAYER>'::uuid, '<NOME_PLAYER>')
on conflict (id) do update
set display_name = excluded.display_name;

with nova as (
  insert into public.campaigns (name, created_by)
  values ('<NOME_DA_CAMPANHA>', '<UUID_TABLE_ADMIN>'::uuid)
  returning id
)
insert into public.campaign_members (campaign_id, user_id, role, seat)
select id, '<UUID_TABLE_ADMIN>'::uuid, 'table_admin'::public.member_role, 1 from nova
union all
select id, '<UUID_PLAYER>'::uuid, 'player'::public.member_role, 2 from nova;

commit;
*/
