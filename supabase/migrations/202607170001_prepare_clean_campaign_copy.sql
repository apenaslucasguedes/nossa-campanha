begin;

create table public.campaign_copy_requests (
  request_id uuid primary key,
  source_campaign_id uuid not null references public.campaigns(id) on delete restrict,
  archived_campaign_id uuid not null references public.campaigns(id) on delete restrict,
  new_campaign_id uuid not null references public.campaigns(id) on delete restrict,
  character_map jsonb not null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (source_campaign_id, request_id)
);

alter table public.campaign_copy_requests enable row level security;

create function public.prepare_clean_campaign_copy(
  p_source_campaign_id uuid,
  p_new_campaign_name text,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  source_row public.campaigns%rowtype;
  new_row public.campaigns%rowtype;
  prior public.campaign_copy_requests%rowtype;
  character_row public.characters%rowtype;
  new_character_id uuid;
  character_map jsonb := '{}'::jsonb;
  archive_suffix text := format(' — Testes %s', to_char(current_date, 'YYYY-MM-DD'));
  archive_name text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_source_campaign_id is null or p_request_id is null then raise exception 'INVALID_ARGUMENT' using errcode = '22023'; end if;

  select * into prior from public.campaign_copy_requests where request_id = p_request_id;
  if found then
    if prior.source_campaign_id <> p_source_campaign_id or prior.requested_by <> uid then
      raise exception 'REQUEST_ID_CONFLICT' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'archived_campaign_id', prior.archived_campaign_id,
      'new_campaign_id', prior.new_campaign_id,
      'character_map', prior.character_map
    );
  end if;

  select * into source_row from public.campaigns where id = p_source_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.is_campaign_admin(p_source_campaign_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if source_row.status = 'arquivada' then raise exception 'CAMPAIGN_ALREADY_ARCHIVED' using errcode = '23505'; end if;
  if trim(coalesce(p_new_campaign_name, '')) <> source_row.name then raise exception 'INVALID_NEW_NAME' using errcode = '22023'; end if;

  archive_name := left(source_row.name, greatest(1, 120 - char_length(archive_suffix))) || archive_suffix;
  update public.campaigns set name = archive_name, status = 'arquivada', updated_at = now() where id = source_row.id;

  insert into public.campaigns(name, status, premise, current_summary, current_region_id, last_session_summary, active_objectives, important_notes, created_by, updated_at)
  values(source_row.name, 'ativa', source_row.premise, '', source_row.current_region_id, '', source_row.active_objectives, source_row.important_notes, source_row.created_by, now())
  returning * into new_row;

  insert into public.campaign_members(campaign_id, user_id, role, seat, joined_at)
    select new_row.id, user_id, role, seat, now() from public.campaign_members where campaign_id = source_row.id;

  for character_row in select * from public.characters where campaign_id = source_row.id order by created_at, id loop
    insert into public.characters(campaign_id, owner_id, name, class_key, level, presentation, origin, appearance, personality, objective, fear, initial_bond, current_bond, attributes, defense, inventory_capacity, avatar)
    values(new_row.id, character_row.owner_id, character_row.name, character_row.class_key, character_row.level, character_row.presentation, character_row.origin, character_row.appearance, character_row.personality, character_row.objective, character_row.fear, character_row.initial_bond, character_row.current_bond, character_row.attributes, character_row.defense, character_row.inventory_capacity, character_row.avatar)
    returning id into new_character_id;

    insert into public.character_states(character_id, vitality_current, vitality_max, resource_current, resource_max, updated_by)
      select new_character_id, vitality_max, vitality_max, resource_max, resource_max, uid
      from public.character_states where character_id = character_row.id;
    if not found then raise exception 'CHARACTER_STATE_MISSING' using errcode = 'P0002'; end if;

    insert into public.character_specialties(character_id, name, source)
      select new_character_id, name, source from public.character_specialties where character_id = character_row.id;
    character_map := character_map || jsonb_build_object(character_row.id::text, new_character_id);
  end loop;

  if (select count(*) from public.characters where campaign_id = new_row.id) <> (select count(*) from public.characters where campaign_id = source_row.id) then
    raise exception 'CHARACTER_COPY_INCOMPLETE' using errcode = 'P0002';
  end if;

  insert into public.campaign_sessions(campaign_id, number, title, status, started_by)
    values(new_row.id, 1, '', 'active', uid);

  insert into public.campaign_copy_requests(request_id, source_campaign_id, archived_campaign_id, new_campaign_id, character_map, requested_by)
    values(p_request_id, source_row.id, source_row.id, new_row.id, character_map, uid);

  return jsonb_build_object('archived_campaign_id', source_row.id, 'new_campaign_id', new_row.id, 'character_map', character_map);
end;
$$;

revoke all on table public.campaign_copy_requests from public, anon, authenticated;
revoke all on function public.prepare_clean_campaign_copy(uuid, text, uuid) from public;
grant execute on function public.prepare_clean_campaign_copy(uuid, text, uuid) to authenticated;

commit;
