begin;

-- =========================================================================
-- 1. characters.campaign_id nullable ("Biblioteca") + unicidade por campanha
-- =========================================================================

alter table public.characters alter column campaign_id drop not null;

alter table public.characters drop constraint if exists characters_campaign_id_owner_id_key;

create unique index if not exists characters_campaign_owner_seat_uidx
  on public.characters(campaign_id, owner_id)
  where campaign_id is not null;

drop policy if exists characters_select_campaign on public.characters;
create policy characters_select_campaign on public.characters
  for select to authenticated
  using (owner_id = auth.uid() or (campaign_id is not null and public.is_campaign_member(campaign_id)));

drop policy if exists characters_insert_owner on public.characters;
create policy characters_insert_owner on public.characters
  for insert to authenticated
  with check (owner_id = auth.uid() and (campaign_id is null or public.is_campaign_member(campaign_id)));

drop policy if exists characters_update_owner on public.characters;
create policy characters_update_owner on public.characters
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- =========================================================================
-- 2. create_my_character passa a receber campaign_id explícito (nullable)
-- =========================================================================

create or replace function public.create_my_character(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); campaign uuid; cid uuid; attrs jsonb := payload->'attributes'; ck text := payload->>'class_key'; specs jsonb := payload->'specialties';
  vitality integer; resource integer; defense_value integer; inventory_value integer; primary_value integer; class_vitality integer; class_resource integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if payload ? 'campaign_id' and payload->>'campaign_id' is not null then
    begin campaign := (payload->>'campaign_id')::uuid;
    exception when invalid_text_representation then raise exception 'INVALID_CAMPAIGN' using errcode='22023'; end;
    if not public.is_campaign_member(campaign) then raise exception 'CAMPAIGN_REQUIRED' using errcode='42501'; end if;
    if exists(select 1 from public.characters c where c.campaign_id=campaign and c.owner_id=uid) then raise exception 'CHARACTER_EXISTS' using errcode='23505'; end if;
  else
    campaign := null;
  end if;
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

create or replace function public.assign_character_to_campaign(target_character uuid, target_campaign uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not exists(select 1 from public.characters where id=target_character and owner_id=uid) then raise exception 'NOT_OWNER' using errcode='42501'; end if;
  if not public.is_campaign_member(target_campaign) then raise exception 'CAMPAIGN_REQUIRED' using errcode='42501'; end if;
  if exists(select 1 from public.characters where campaign_id=target_campaign and owner_id=uid) then raise exception 'SEAT_TAKEN' using errcode='23505'; end if;
  update public.characters set campaign_id=target_campaign, updated_at=now() where id=target_character;
end; $$;

revoke all on function public.assign_character_to_campaign(uuid, uuid) from public;
grant execute on function public.assign_character_to_campaign(uuid, uuid) to authenticated;

-- =========================================================================
-- 3. campaign_sessions
-- =========================================================================

create table public.campaign_sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  number integer not null check (number > 0),
  title text not null default '' check (char_length(title) <= 120),
  status text not null default 'active' check (status in ('active','ended','archived')),
  started_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, number)
);

create unique index campaign_sessions_one_active on public.campaign_sessions(campaign_id) where status='active';
create index campaign_sessions_campaign_idx on public.campaign_sessions(campaign_id);

alter table public.campaign_sessions enable row level security;
create policy campaign_sessions_select_members on public.campaign_sessions
  for select to authenticated using (public.is_campaign_member(campaign_id));

create function public.start_campaign_session(target_campaign uuid, session_title text default '') returns public.campaign_sessions
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); previous public.campaign_sessions%rowtype; created public.campaign_sessions%rowtype; next_number integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_campaign_admin(target_campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_campaign::text || ':sessions', 0));
  select * into previous from public.campaign_sessions where campaign_id=target_campaign and status='active';
  if found then
    update public.campaign_sessions set status='ended', ended_at=now() where id=previous.id;
  end if;
  select coalesce(max(number),0)+1 into next_number from public.campaign_sessions where campaign_id=target_campaign;
  insert into public.campaign_sessions(campaign_id, number, title, status, started_by)
    values(target_campaign, next_number, coalesce(trim(session_title), ''), 'active', uid) returning * into created;
  insert into public.campaign_events(campaign_id, session_id, source, user_id, event_type, summary, payload)
    values(target_campaign, created.id, 'admin', uid, 'session_started', format('Sessão %s iniciada.', created.number), jsonb_build_object('session_id', created.id, 'number', created.number));
  return created;
end; $$;

revoke all on function public.start_campaign_session(uuid, text) from public;
grant execute on function public.start_campaign_session(uuid, text) to authenticated;

-- =========================================================================
-- 4. campaign_events (ledger imutável)
-- =========================================================================

create table public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  session_id uuid references public.campaign_sessions(id) on delete set null,
  source text not null check (source in ('player','gpt','system','admin')),
  user_id uuid references public.profiles(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 40),
  summary text not null check (char_length(summary) <= 500),
  payload jsonb not null default '{}'::jsonb,
  payload_version integer not null default 1,
  is_test boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index campaign_events_campaign_sequence_idx on public.campaign_events(campaign_id, sequence desc);
create index campaign_events_session_idx on public.campaign_events(session_id);

alter table public.campaign_events enable row level security;
create policy campaign_events_select_members on public.campaign_events
  for select to authenticated using (public.is_campaign_member(campaign_id));

create function public.campaign_events_guard_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.sequence is distinct from old.sequence or new.campaign_id is distinct from old.campaign_id
    or new.session_id is distinct from old.session_id or new.source is distinct from old.source or new.user_id is distinct from old.user_id
    or new.character_id is distinct from old.character_id or new.event_type is distinct from old.event_type or new.summary is distinct from old.summary
    or new.payload is distinct from old.payload or new.payload_version is distinct from old.payload_version or new.is_test is distinct from old.is_test
    or new.created_at is distinct from old.created_at then
    raise exception 'EVENT_IMMUTABLE' using errcode='42501';
  end if;
  return new;
end; $$;

create trigger campaign_events_guard_update_trg before update on public.campaign_events
  for each row execute function public.campaign_events_guard_update();

create policy campaign_events_update_archive_admin on public.campaign_events
  for update to authenticated using (public.is_campaign_admin(campaign_id)) with check (public.is_campaign_admin(campaign_id));

-- =========================================================================
-- 5. campaign_event_prefs ("Limpar visualização")
-- =========================================================================

create table public.campaign_event_prefs (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hidden_before_sequence bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

alter table public.campaign_event_prefs enable row level security;
create policy campaign_event_prefs_owner on public.campaign_event_prefs
  for all to authenticated
  using (user_id = auth.uid() and public.is_campaign_member(campaign_id))
  with check (user_id = auth.uid() and public.is_campaign_member(campaign_id));

-- =========================================================================
-- 6. roll_requests
-- =========================================================================

create table public.roll_requests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  session_id uuid references public.campaign_sessions(id) on delete set null,
  requested_character_id uuid not null references public.characters(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  attribute text check (attribute in ('strength','agility','intellect','presence','instinct')),
  specialty text check (specialty in ('Atletismo','Acrobacia','Furtividade','Investigação','Percepção','Sobrevivência','Medicina','Persuasão','Intimidação','História','Arcanismo','Performance','Rastreamento','Alquimia')),
  modifier integer not null default 0 check (modifier between -10 and 10),
  reason text not null default '' check (char_length(reason) <= 240),
  difficulty integer check (difficulty between 1 and 30),
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  source text not null default 'admin' check (source in ('admin','gpt','system')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  resulting_roll_id uuid,
  constraint roll_requests_needs_facet check (attribute is not null or specialty is not null)
);

create index roll_requests_campaign_status_idx on public.roll_requests(campaign_id, status);
create index roll_requests_character_idx on public.roll_requests(requested_character_id);

alter table public.roll_requests enable row level security;
create policy roll_requests_select_members on public.roll_requests
  for select to authenticated using (public.is_campaign_member(campaign_id));

create function public.request_dice_roll(payload jsonb) returns public.roll_requests
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); campaign uuid; session_row public.campaign_sessions%rowtype; created public.roll_requests%rowtype; target_character uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  begin campaign := (payload->>'campaign_id')::uuid; target_character := (payload->>'character_id')::uuid;
  exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if not public.is_campaign_admin(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if not exists(select 1 from public.characters where id=target_character and campaign_id=campaign) then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
  select * into session_row from public.campaign_sessions where campaign_id=campaign and status='active';
  if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;
  insert into public.roll_requests(campaign_id, session_id, requested_character_id, requested_by, attribute, specialty, modifier, reason, difficulty, source)
    values(campaign, session_row.id, target_character, uid, nullif(payload->>'attribute',''), nullif(payload->>'specialty',''), coalesce((payload->>'modifier')::integer,0), coalesce(payload->>'reason',''), nullif(payload->>'difficulty','')::integer, coalesce(payload->>'source','admin'))
    returning * into created;
  insert into public.campaign_events(campaign_id, session_id, source, user_id, character_id, event_type, summary, payload)
    values(campaign, session_row.id, 'admin', uid, target_character, 'roll_requested', 'Rolagem solicitada.', jsonb_build_object('roll_request_id', created.id));
  return created;
end; $$;

revoke all on function public.request_dice_roll(jsonb) from public;
grant execute on function public.request_dice_roll(jsonb) to authenticated;

create function public.cancel_roll_request(target_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); campaign uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select campaign_id into campaign from public.roll_requests where id=target_request and status='pending';
  if campaign is null then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
  if not public.is_campaign_admin(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.roll_requests set status='cancelled' where id=target_request;
end; $$;

revoke all on function public.cancel_roll_request(uuid) from public;
grant execute on function public.cancel_roll_request(uuid) to authenticated;

-- =========================================================================
-- 7. dice_rolls
-- =========================================================================

create table public.dice_rolls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  session_id uuid references public.campaign_sessions(id) on delete set null,
  character_id uuid not null references public.characters(id) on delete cascade,
  rolled_by uuid not null references public.profiles(id) on delete restrict,
  roll_request_id uuid references public.roll_requests(id) on delete set null,
  dice text not null check (dice in ('d4','d6','d8','d10','d12','d20','d100')),
  count smallint not null default 1 check (count between 1 and 4),
  modifier integer not null default 0 check (modifier between -10 and 10),
  attribute text check (attribute in ('strength','agility','intellect','presence','instinct')),
  specialty text check (specialty in ('Atletismo','Acrobacia','Furtividade','Investigação','Percepção','Sobrevivência','Medicina','Persuasão','Intimidação','História','Arcanismo','Performance','Rastreamento','Alquimia')),
  difficulty integer check (difficulty between 1 and 30),
  results integer[] not null,
  total integer not null,
  outcome text check (outcome in ('success','failure','critical_success','critical_failure')),
  label text not null default '' check (char_length(label) <= 120),
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  event_id uuid references public.campaign_events(id) on delete set null
);

alter table public.roll_requests add constraint roll_requests_resulting_roll_fk foreign key (resulting_roll_id) references public.dice_rolls(id) on delete set null;

create index dice_rolls_campaign_created_idx on public.dice_rolls(campaign_id, created_at desc);
create index dice_rolls_character_idx on public.dice_rolls(character_id);

alter table public.dice_rolls enable row level security;
create policy dice_rolls_select_members on public.dice_rolls
  for select to authenticated using (public.is_campaign_member(campaign_id));

-- =========================================================================
-- 8. perform_dice_roll — RPC transacional de rolagem
-- =========================================================================

create function public.perform_dice_roll(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  campaign uuid;
  dice_value text := payload->>'dice';
  count_value smallint := coalesce((payload->>'count')::smallint, 1);
  modifier_value integer := coalesce((payload->>'modifier')::integer, 0);
  roll_request uuid;
  is_test_value boolean := coalesce((payload->>'is_test')::boolean, false);
  label_value text := coalesce(payload->>'label', '');
  session_row public.campaign_sessions%rowtype;
  request_row public.roll_requests%rowtype;
  character_row public.characters%rowtype;
  sides integer;
  results_value integer[] := '{}';
  total_value integer := 0;
  outcome_value text;
  attribute_value text;
  specialty_value text;
  difficulty_value integer;
  event_row public.campaign_events%rowtype;
  roll_row public.dice_rolls%rowtype;
  i integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  begin campaign := (payload->>'campaign_id')::uuid;
  exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if campaign is null or not public.is_campaign_member(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if dice_value not in ('d4','d6','d8','d10','d12','d20','d100') then raise exception 'INVALID_DICE' using errcode='22023'; end if;
  if count_value < 1 or count_value > 4 then raise exception 'INVALID_DICE' using errcode='22023'; end if;
  if modifier_value < -10 or modifier_value > 10 then raise exception 'INVALID_DICE' using errcode='22023'; end if;

  select * into session_row from public.campaign_sessions where campaign_id=campaign and status='active';
  if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;

  if payload ? 'roll_request_id' and payload->>'roll_request_id' is not null then
    begin roll_request := (payload->>'roll_request_id')::uuid;
    exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
    select * into request_row from public.roll_requests where id=roll_request and campaign_id=campaign for update;
    if not found or request_row.status <> 'pending' then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
    select * into character_row from public.characters where id=request_row.requested_character_id;
    if character_row.owner_id <> uid then raise exception 'NOT_YOUR_CHARACTER' using errcode='42501'; end if;
    attribute_value := request_row.attribute; specialty_value := request_row.specialty; difficulty_value := request_row.difficulty;
  else
    select * into character_row from public.characters where campaign_id=campaign and owner_id=uid;
    if not found then raise exception 'NO_CHARACTER_SEATED' using errcode='P0002'; end if;
    attribute_value := nullif(payload->>'attribute',''); specialty_value := nullif(payload->>'specialty',''); difficulty_value := nullif(payload->>'difficulty','')::integer;
  end if;

  sides := case dice_value when 'd4' then 4 when 'd6' then 6 when 'd8' then 8 when 'd10' then 10 when 'd12' then 12 when 'd20' then 20 else 100 end;
  for i in 1..count_value loop
    results_value := results_value || (floor(random()*sides)+1)::integer;
  end loop;
  total_value := (select sum(value) from unnest(results_value) value) + modifier_value;

  if difficulty_value is not null then
    outcome_value := case when total_value >= difficulty_value then 'success' else 'failure' end;
  elsif dice_value = 'd20' and count_value = 1 then
    outcome_value := case results_value[1] when 20 then 'critical_success' when 1 then 'critical_failure' else null end;
  else
    outcome_value := null;
  end if;

  insert into public.campaign_events(campaign_id, session_id, source, user_id, character_id, event_type, summary, payload, is_test)
    values(campaign, session_row.id, 'player', uid, character_row.id, 'dice_roll',
      format('%s lançou %s%s e obteve %s.', character_row.name, count_value, dice_value, total_value),
      jsonb_build_object('dice', dice_value, 'count', count_value, 'modifier', modifier_value, 'results', results_value, 'total', total_value, 'outcome', outcome_value, 'label', label_value),
      is_test_value)
    returning * into event_row;

  insert into public.dice_rolls(campaign_id, session_id, character_id, rolled_by, roll_request_id, dice, count, modifier, attribute, specialty, difficulty, results, total, outcome, label, is_test, event_id)
    values(campaign, session_row.id, character_row.id, uid, roll_request, dice_value, count_value, modifier_value, attribute_value, specialty_value, difficulty_value, results_value, total_value, outcome_value, left(label_value,120), is_test_value, event_row.id)
    returning * into roll_row;

  if roll_request is not null then
    update public.roll_requests set status='completed', completed_at=now(), resulting_roll_id=roll_row.id where id=roll_request;
  end if;

  return jsonb_build_object('roll_id', roll_row.id, 'event_id', event_row.id, 'character_id', character_row.id, 'character_name', character_row.name,
    'dice', dice_value, 'count', count_value, 'modifier', modifier_value, 'results', results_value, 'total', total_value, 'outcome', outcome_value, 'is_test', is_test_value);
end; $$;

revoke all on function public.perform_dice_roll(jsonb) from public;
grant execute on function public.perform_dice_roll(jsonb) to authenticated;

-- =========================================================================
-- 9. create_campaign / archive_campaign
-- =========================================================================

create function public.create_campaign(payload jsonb) returns public.campaigns
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); created public.campaigns%rowtype; session_row public.campaign_sessions%rowtype; name_value text := trim(payload->>'name');
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if char_length(name_value) < 1 or char_length(name_value) > 120 then raise exception 'INVALID_NAME' using errcode='22023'; end if;
  insert into public.campaigns(name, created_by, premise, current_region_id)
    values(name_value, uid, coalesce(payload->>'premise',''), nullif(payload->>'region_id',''))
    returning * into created;
  insert into public.campaign_members(campaign_id, user_id, role, seat) values(created.id, uid, 'table_admin', 1);
  insert into public.campaign_sessions(campaign_id, number, title, status, started_by)
    values(created.id, 1, '', 'active', uid) returning * into session_row;
  insert into public.campaign_events(campaign_id, session_id, source, user_id, event_type, summary, payload)
    values(created.id, session_row.id, 'admin', uid, 'campaign_created', format('Campanha "%s" criada.', created.name), jsonb_build_object('campaign_id', created.id));
  return created;
end; $$;

revoke all on function public.create_campaign(jsonb) from public;
grant execute on function public.create_campaign(jsonb) to authenticated;

create function public.archive_campaign(target_campaign uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_campaign_admin(target_campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.campaigns set status='arquivada', updated_at=now() where id=target_campaign;
end; $$;

revoke all on function public.archive_campaign(uuid) from public;
grant execute on function public.archive_campaign(uuid) to authenticated;

-- =========================================================================
-- 10. Glue de combate por sessão + log automático em campaign_events
-- =========================================================================

alter table public.combat_sessions add column if not exists campaign_session_id uuid references public.campaign_sessions(id) on delete set null;

create function public.game_actions_log_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare active_session uuid;
begin
  select id into active_session from public.campaign_sessions where campaign_id=new.campaign_id and status='active';
  insert into public.campaign_events(campaign_id, session_id, source, user_id, event_type, summary, payload)
    values(new.campaign_id, active_session, 'admin', new.created_by, new.action_type, new.summary, coalesce(new.result, '{}'::jsonb));
  return new;
end; $$;

create trigger game_actions_log_event_trg after insert on public.game_actions
  for each row execute function public.game_actions_log_event();

-- =========================================================================
-- 11. get_campaign_snapshot — camada de preparação para o GPT (sem Actions)
-- =========================================================================

create function public.get_campaign_snapshot(target_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if not public.is_campaign_member(target_campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select jsonb_build_object(
    'campaign', to_jsonb(c),
    'active_session', (select to_jsonb(s) from public.campaign_sessions s where s.campaign_id=target_campaign and s.status='active'),
    'characters', (select coalesce(jsonb_agg(to_jsonb(ch)), '[]'::jsonb) from public.characters ch where ch.campaign_id=target_campaign),
    'locations', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from public.campaign_locations l where l.campaign_id=target_campaign and l.revealed),
    'active_combat', (select to_jsonb(cs) from public.combat_sessions cs where cs.campaign_id=target_campaign and cs.status='active'),
    'pending_roll_requests', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.roll_requests r where r.campaign_id=target_campaign and r.status='pending'),
    'recent_events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.sequence desc), '[]'::jsonb) from (select * from public.campaign_events where campaign_id=target_campaign and is_test=false and is_archived=false order by sequence desc limit 50) e),
    'last_sequence', (select max(sequence) from public.campaign_events where campaign_id=target_campaign)
  ) into result
  from public.campaigns c where c.id=target_campaign;
  return result;
end; $$;

revoke all on function public.get_campaign_snapshot(uuid) from public;
grant execute on function public.get_campaign_snapshot(uuid) to authenticated;

-- =========================================================================
-- 12. Realtime
-- =========================================================================

alter publication supabase_realtime add table
  public.campaign_sessions, public.campaign_events, public.roll_requests, public.dice_rolls;

-- =========================================================================
-- 13. Backfill: uma sessão ativa por campanha existente
-- =========================================================================

insert into public.campaign_sessions (campaign_id, number, title, status, started_by, started_at)
select c.id, 1, '', 'active', c.created_by, c.created_at
from public.campaigns c
where not exists (select 1 from public.campaign_sessions s where s.campaign_id = c.id);

commit;
