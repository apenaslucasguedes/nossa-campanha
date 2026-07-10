-- Execute manual e substitua apenas os valores entre <...>. Não grave UUIDs reais neste arquivo.
begin;
insert into public.profiles (id, display_name) values
  ('<UUID_USUARIO_1>'::uuid, '<NOME_1>'),
  ('<UUID_USUARIO_2>'::uuid, '<NOME_2>');
with nova as (
  insert into public.campaigns (name, created_by) values ('<NOME_CAMPANHA>', '<UUID_USUARIO_1>'::uuid) returning id
)
insert into public.campaign_members (campaign_id, user_id, role, seat)
select id, '<UUID_USUARIO_1>'::uuid, 'table_admin', 1 from nova
union all
select id, '<UUID_USUARIO_2>'::uuid, 'player', 2 from nova;
commit;
