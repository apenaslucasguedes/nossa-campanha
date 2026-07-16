begin;

-- =========================================================================
-- 1. gpt_campaign_connections — chave de conexão por campanha (fase 1)
-- =========================================================================
-- Somente o hash da chave é armazenado. A chave bruta é gerada e devolvida
-- uma única vez por create_gpt_campaign_connection e nunca é persistida.

create table public.gpt_campaign_connections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  key_hash text not null unique,
  label text not null check (char_length(trim(label)) between 1 and 80),
  permissions text[] not null check (
    cardinality(permissions) > 0
    and permissions <@ array['read_snapshot','request_roll']::text[]
  ),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index gpt_campaign_connections_campaign_idx on public.gpt_campaign_connections(campaign_id);

alter table public.gpt_campaign_connections enable row level security;
-- Nenhuma policy de select/insert/update/delete é criada de propósito: toda
-- leitura e escrita desta tabela acontece exclusivamente pelas funções
-- SECURITY DEFINER abaixo, nunca por consulta direta via PostgREST.

-- =========================================================================
-- 2. Gestão da chave (somente o administrador humano, via JWT normal)
-- =========================================================================

create function public.create_gpt_campaign_connection(target_campaign uuid, connection_label text, connection_permissions text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  clean_label text := trim(connection_label);
  raw_key text;
  hashed text;
  created public.gpt_campaign_connections%rowtype;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_campaign_admin(target_campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if char_length(clean_label) < 1 or char_length(clean_label) > 80 then raise exception 'INVALID_LABEL' using errcode='22023'; end if;
  if connection_permissions is null or cardinality(connection_permissions) = 0
    or not (connection_permissions <@ array['read_snapshot','request_roll']::text[]) then
    raise exception 'INVALID_PERMISSIONS' using errcode='22023';
  end if;

  raw_key := 'rlk_' || replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  hashed := encode(sha256(convert_to(raw_key,'UTF8')),'hex');

  insert into public.gpt_campaign_connections(campaign_id, key_hash, label, permissions, created_by)
    values(target_campaign, hashed, clean_label, connection_permissions, uid)
    returning * into created;

  return jsonb_build_object(
    'id', created.id,
    'raw_key', raw_key,
    'label', created.label,
    'permissions', created.permissions,
    'created_at', created.created_at
  );
end; $$;

revoke all on function public.create_gpt_campaign_connection(uuid, text, text[]) from public;
grant execute on function public.create_gpt_campaign_connection(uuid, text, text[]) to authenticated;

create function public.revoke_gpt_campaign_connection(target_connection uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); owning_campaign uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select campaign_id into owning_campaign from public.gpt_campaign_connections where id = target_connection;
  if owning_campaign is null then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
  if not public.is_campaign_admin(owning_campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.gpt_campaign_connections set revoked_at = now() where id = target_connection and revoked_at is null;
end; $$;

revoke all on function public.revoke_gpt_campaign_connection(uuid) from public;
grant execute on function public.revoke_gpt_campaign_connection(uuid) to authenticated;

-- =========================================================================
-- 3. Validação fechada da chave (chamável sem sessão de usuário)
-- =========================================================================
-- Não libera nenhuma consulta arbitrária: devolve somente campaign_id e o
-- usuário que criou a chave, e apenas quando a chave existe, não está
-- revogada e possui a permissão exigida.

create function public.authenticate_gpt_key(lookup_key_hash text, required_permission text) returns table(campaign_id uuid, granted_by uuid)
language plpgsql security definer set search_path = '' as $$
declare found_row public.gpt_campaign_connections%rowtype;
begin
  if required_permission not in ('read_snapshot','request_roll') then raise exception 'INVALID_PERMISSION' using errcode='22023'; end if;
  select * into found_row from public.gpt_campaign_connections c where c.key_hash = lookup_key_hash;
  if not found or found_row.revoked_at is not null then raise exception 'GPT_KEY_INVALID' using errcode='42501'; end if;
  if not (required_permission = any(found_row.permissions)) then raise exception 'GPT_KEY_FORBIDDEN' using errcode='42501'; end if;
  update public.gpt_campaign_connections set last_used_at = now() where id = found_row.id;
  return query select found_row.campaign_id, found_row.created_by;
end; $$;

revoke all on function public.authenticate_gpt_key(text, text) from public;
grant execute on function public.authenticate_gpt_key(text, text) to anon, authenticated;

-- =========================================================================
-- 4. get_campaign_snapshot — extrai o builder para reuso pelo caminho GPT
-- =========================================================================
-- _campaign_snapshot_payload é a única fonte da forma do snapshot; tanto o
-- caminho autenticado por usuário (get_campaign_snapshot) quanto o caminho
-- por chave de campanha (get_campaign_snapshot_for_gpt) chamam a mesma
-- função, evitando dois formatos divergentes.

create function public._campaign_snapshot_payload(target_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'campaign', to_jsonb(c),
    'active_session', (select to_jsonb(s) from public.campaign_sessions s where s.campaign_id = target_campaign and s.status = 'active'),
    'characters', (
      select coalesce(jsonb_agg(
        to_jsonb(ch) || jsonb_build_object(
          'character_states', to_jsonb(cs),
          'character_conditions', coalesce((select jsonb_agg(to_jsonb(cc)) from public.character_conditions cc where cc.character_id = ch.id), '[]'::jsonb),
          'character_specialties', coalesce((select jsonb_agg(to_jsonb(csp)) from public.character_specialties csp where csp.character_id = ch.id), '[]'::jsonb)
        )
      ), '[]'::jsonb)
      from public.characters ch
      left join public.character_states cs on cs.character_id = ch.id
      where ch.campaign_id = target_campaign
    ),
    'locations', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from public.campaign_locations l where l.campaign_id = target_campaign and l.revealed),
    'active_combat', (
      select jsonb_build_object(
        'session', to_jsonb(combat),
        'participants', coalesce((select jsonb_agg(to_jsonb(p) order by p.position) from public.combat_participants p where p.session_id = combat.id), '[]'::jsonb),
        'enemies', coalesce((select jsonb_agg(to_jsonb(e)) from public.enemy_instances e where e.session_id = combat.id), '[]'::jsonb)
      )
      from public.combat_sessions combat where combat.campaign_id = target_campaign and combat.status = 'active'
    ),
    'pending_roll_requests', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.roll_requests r where r.campaign_id = target_campaign and r.status = 'pending'),
    'recent_dice_rolls', (select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc), '[]'::jsonb) from (select * from public.dice_rolls where campaign_id = target_campaign and is_test = false order by created_at desc limit 20) d),
    'recent_events', (select coalesce(jsonb_agg(to_jsonb(e) order by e.sequence desc), '[]'::jsonb) from (select * from public.campaign_events where campaign_id = target_campaign and is_test = false and is_archived = false order by sequence desc limit 50) e),
    'last_sequence', (select max(sequence) from public.campaign_events where campaign_id = target_campaign)
  ) into result
  from public.campaigns c where c.id = target_campaign;
  return result;
end; $$;

revoke all on function public._campaign_snapshot_payload(uuid) from public;

create or replace function public.get_campaign_snapshot(target_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_campaign_member(target_campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return public._campaign_snapshot_payload(target_campaign);
end; $$;

create function public.get_campaign_snapshot_for_gpt(lookup_key_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare resolved_campaign uuid;
begin
  select t.campaign_id into resolved_campaign from public.authenticate_gpt_key(lookup_key_hash, 'read_snapshot') as t;
  return public._campaign_snapshot_payload(resolved_campaign);
end; $$;

revoke all on function public.get_campaign_snapshot_for_gpt(text) from public;
grant execute on function public.get_campaign_snapshot_for_gpt(text) to anon, authenticated;

-- =========================================================================
-- 5. request_dice_roll — extrai o núcleo para reuso pelo caminho GPT
-- =========================================================================
-- A rolagem em si continua exclusiva do jogador (perform_dice_roll, RPC não
-- exposta a esta chave). O GPT só pode pedir que o jogador role.

create function public._create_roll_request(target_campaign uuid, target_character uuid, actor uuid, actor_source text, attribute_value text, specialty_value text, modifier_value integer, reason_value text, difficulty_value integer) returns public.roll_requests
language plpgsql security definer set search_path = '' as $$
declare session_row public.campaign_sessions%rowtype; created public.roll_requests%rowtype;
begin
  if not exists(select 1 from public.characters where id = target_character and campaign_id = target_campaign) then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
  select * into session_row from public.campaign_sessions where campaign_id = target_campaign and status = 'active';
  if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;
  insert into public.roll_requests(campaign_id, session_id, requested_character_id, requested_by, attribute, specialty, modifier, reason, difficulty, source)
    values(target_campaign, session_row.id, target_character, actor, attribute_value, specialty_value, modifier_value, reason_value, difficulty_value, actor_source)
    returning * into created;
  insert into public.campaign_events(campaign_id, session_id, source, user_id, character_id, event_type, summary, payload)
    values(target_campaign, session_row.id, actor_source, actor, target_character, 'roll_requested', 'Rolagem solicitada.', jsonb_build_object('roll_request_id', created.id));
  return created;
end; $$;

revoke all on function public._create_roll_request(uuid, uuid, uuid, text, text, text, integer, text, integer) from public;

create or replace function public.request_dice_roll(payload jsonb) returns public.roll_requests
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); campaign uuid; target_character uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  begin campaign := (payload->>'campaign_id')::uuid; target_character := (payload->>'character_id')::uuid;
  exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if not public.is_campaign_admin(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return public._create_roll_request(campaign, target_character, uid, coalesce(payload->>'source','admin'), nullif(payload->>'attribute',''), nullif(payload->>'specialty',''), coalesce((payload->>'modifier')::integer,0), coalesce(payload->>'reason',''), nullif(payload->>'difficulty','')::integer);
end; $$;

create function public.request_dice_roll_for_gpt(lookup_key_hash text, payload jsonb) returns public.roll_requests
language plpgsql security definer set search_path = '' as $$
declare resolved_campaign uuid; resolved_actor uuid; requested_campaign uuid; target_character uuid;
begin
  select t.campaign_id, t.granted_by into resolved_campaign, resolved_actor from public.authenticate_gpt_key(lookup_key_hash, 'request_roll') as t;
  begin requested_campaign := (payload->>'campaign_id')::uuid; target_character := (payload->>'character_id')::uuid;
  exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if requested_campaign is not null and requested_campaign <> resolved_campaign then raise exception 'CAMPAIGN_MISMATCH' using errcode='42501'; end if;
  if target_character is null then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  return public._create_roll_request(resolved_campaign, target_character, resolved_actor, 'gpt', nullif(payload->>'attribute',''), nullif(payload->>'specialty',''), coalesce((payload->>'modifier')::integer,0), coalesce(payload->>'reason',''), nullif(payload->>'difficulty','')::integer);
end; $$;

revoke all on function public.request_dice_roll_for_gpt(text, jsonb) from public;
grant execute on function public.request_dice_roll_for_gpt(text, jsonb) to anon, authenticated;

commit;
