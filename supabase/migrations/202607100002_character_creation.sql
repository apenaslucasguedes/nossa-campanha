begin;

create function public.valid_initial_attributes(value jsonb) returns boolean language sql immutable set search_path='' as $$
  select value ?& array['strength','agility','intellect','presence','instinct'] and jsonb_object_length(value)=5 and (select array_agg((entry.value::text)::integer order by (entry.value::text)::integer) from jsonb_each(value) entry)=array[0,1,1,2,3];
$$;

alter table public.characters
  drop constraint characters_class_key_check,
  add constraint characters_class_key_check check (class_key in ('warrior','arcanist','shadow_blade','necromancer','bard','druid')) not valid,
  add column presentation text not null default '' check (char_length(presentation) <= 80),
  add column origin text not null default '' check (char_length(origin) <= 120),
  add column appearance text not null default '' check (char_length(appearance) <= 800),
  add column personality text not null default '' check (char_length(personality) <= 800),
  add column objective text not null default '' check (char_length(objective) <= 500),
  add column fear text not null default '' check (char_length(fear) <= 500),
  add column initial_bond text not null default '' check (char_length(initial_bond) <= 240),
  add column current_bond text not null default '' check (char_length(current_bond) <= 240),
  add column attributes jsonb not null default '{"strength":0,"agility":0,"intellect":0,"presence":0,"instinct":0}'::jsonb,
  add column defense smallint not null default 8 check (defense between 8 and 20),
  add column inventory_capacity smallint not null default 5 check (inventory_capacity between 5 and 20),
  add column avatar jsonb not null default '{}'::jsonb;

alter table public.characters add constraint characters_attributes_shape check (public.valid_initial_attributes(attributes)) not valid;

create table public.character_specialties (
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null check (name in ('Atletismo','Acrobacia','Furtividade','Investigação','Percepção','Sobrevivência','Medicina','Persuasão','Intimidação','História','Arcanismo','Performance','Rastreamento','Alquimia')),
  source text not null check (source in ('class','free')),
  created_at timestamptz not null default now(),
  primary key (character_id, name)
);
create index character_specialties_character_idx on public.character_specialties(character_id);
alter table public.character_specialties enable row level security;
create policy specialties_select_campaign on public.character_specialties for select to authenticated using (exists(select 1 from public.characters c where c.id=character_id and public.is_campaign_member(c.campaign_id)));

drop policy characters_insert_authorized on public.characters;
drop policy characters_update_authorized on public.characters;
create policy characters_insert_owner on public.characters for insert to authenticated with check (public.is_campaign_member(campaign_id) and owner_id=auth.uid());
create policy characters_update_owner on public.characters for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());

create function public.create_my_character(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid(); campaign uuid; cid uuid; attrs jsonb := payload->'attributes'; ck text := payload->>'class_key'; specs jsonb := payload->'specialties';
  vitality integer; resource integer; defense_value integer; inventory_value integer; primary_value integer; class_vitality integer; class_resource integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select cm.campaign_id into campaign from public.campaign_members cm where cm.user_id=uid order by cm.joined_at limit 1;
  if campaign is null then raise exception 'CAMPAIGN_REQUIRED' using errcode='42501'; end if;
  if exists(select 1 from public.characters c where c.campaign_id=campaign and c.owner_id=uid) then raise exception 'CHARACTER_EXISTS' using errcode='23505'; end if;
  if ck not in ('warrior','arcanist','shadow_blade','necromancer','bard','druid') then raise exception 'INVALID_CLASS' using errcode='22023'; end if;
  if attrs is null or jsonb_object_length(attrs)<>5 or not attrs ?& array['strength','agility','intellect','presence','instinct'] or
    (select array_agg((value::text)::integer order by (value::text)::integer) from jsonb_each(attrs)) <> array[0,1,1,2,3] then raise exception 'INVALID_ATTRIBUTES' using errcode='22023'; end if;
  if jsonb_typeof(specs)<>'array' or jsonb_array_length(specs)<>3 or (select count(distinct value) from jsonb_array_elements_text(specs))<>3 then raise exception 'INVALID_SPECIALTIES' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements_text(specs) s(value) where value not in ('Atletismo','Acrobacia','Furtividade','Investigação','Percepção','Sobrevivência','Medicina','Persuasão','Intimidação','História','Arcanismo','Performance','Rastreamento','Alquimia')) then raise exception 'INVALID_SPECIALTIES' using errcode='22023'; end if;
  if (select count(*) from jsonb_array_elements_text(specs) s(value) where value = any(case ck when 'warrior' then array['Atletismo','Intimidação','Sobrevivência'] when 'arcanist' then array['Arcanismo','Investigação','História'] when 'shadow_blade' then array['Furtividade','Acrobacia','Percepção'] when 'necromancer' then array['Arcanismo','Medicina','História'] when 'bard' then array['Performance','Persuasão','História'] else array['Sobrevivência','Medicina','Rastreamento'] end)) < 2 then raise exception 'INVALID_SPECIALTIES' using errcode='22023'; end if;
  select case ck when 'warrior' then 12 when 'druid' then 10 when 'shadow_blade' then 9 when 'bard' then 9 else 8 end,
    case when ck in ('arcanist','necromancer') then 5 else case when ck='warrior' then 3 else 4 end end,
    case when ck='warrior' then (attrs->>'strength')::int when ck in ('arcanist','necromancer') then (attrs->>'intellect')::int when ck='shadow_blade' then (attrs->>'agility')::int when ck='bard' then (attrs->>'presence')::int else (attrs->>'instinct')::int end
    into class_vitality,class_resource,primary_value;
  vitality := class_vitality+(attrs->>'strength')::int*2+(attrs->>'instinct')::int;
  resource := class_resource+primary_value; defense_value:=8+(attrs->>'agility')::int+(attrs->>'instinct')::int; inventory_value:=5+(attrs->>'strength')::int*2;
  insert into public.characters(campaign_id,owner_id,name,class_key,level,presentation,origin,appearance,personality,objective,fear,initial_bond,current_bond,attributes,defense,inventory_capacity,avatar)
  values(campaign,uid,trim(payload->>'name'),ck,1,coalesce(payload->>'presentation',''),coalesce(payload->>'origin',''),coalesce(payload->>'appearance',''),coalesce(payload->>'personality',''),coalesce(payload->>'objective',''),coalesce(payload->>'fear',''),coalesce(payload->>'bond',''),coalesce(payload->>'bond',''),attrs,defense_value,inventory_value,coalesce(payload->'avatar','{}'::jsonb)) returning id into cid;
  insert into public.character_states(character_id,vitality_current,vitality_max,resource_current,resource_max,updated_by) values(cid,vitality,vitality,resource,resource,uid);
  insert into public.character_specialties(character_id,name,source) select cid,value,case when ordinal<=2 then 'class' else 'free' end from jsonb_array_elements_text(specs) with ordinality as s(value,ordinal);
  return cid;
end; $$;
revoke all on function public.create_my_character(jsonb) from public;
grant execute on function public.create_my_character(jsonb) to authenticated;

commit;
