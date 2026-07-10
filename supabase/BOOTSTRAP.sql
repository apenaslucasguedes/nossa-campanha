begin;

insert into public.profiles (id, display_name) values
  ('52a3eb5b-f5f6-4d4f-9976-93de9a4e9e22'::uuid, 'lucas'),
  ('9201d916-a9bf-47e5-815f-5dcd6d139014'::uuid, 'matheus')
on conflict (id) do update
set display_name = excluded.display_name;

with nova as (
  insert into public.campaigns (name, created_by)
  values ('Nossa Campanha', '52a3eb5b-f5f6-4d4f-9976-93de9a4e9e22'::uuid)
  returning id
)
insert into public.campaign_members (campaign_id, user_id, role, seat)
select id, '52a3eb5b-f5f6-4d4f-9976-93de9a4e9e22'::uuid, 'table_admin'::public.member_role, 1 from nova
union all
select id, '9201d916-a9bf-47e5-815f-5dcd6d139014'::uuid, 'player'::public.member_role, 2 from nova;

commit;
