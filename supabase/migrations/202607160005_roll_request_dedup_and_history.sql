begin;

-- =========================================================================
-- Refino focado da Mesa: evitar solicitações duplicadas, aplicar o
-- modificador da solicitação na rolagem vinculada e enriquecer os eventos
-- de histórico com dados que já existem (personagem, teste, dificuldade,
-- motivo, resultado). Nenhuma coluna nova é criada e nenhum registro
-- histórico é apagado.
-- =========================================================================

-- Rótulos legíveis dos cinco atributos, reutilizados nos resumos de evento.
create or replace function public._attribute_label(attribute_key text) returns text
language sql immutable set search_path = '' as $$
  select case attribute_key
    when 'strength' then 'Força'
    when 'agility' then 'Agilidade'
    when 'intellect' then 'Intelecto'
    when 'presence' then 'Presença'
    when 'instinct' then 'Instinto'
    else attribute_key
  end;
$$;

-- Descrição curta do teste solicitado a partir de atributo/especialidade.
create or replace function public._roll_test_label(attribute_key text, specialty_value text) returns text
language sql immutable set search_path = '' as $$
  select nullif(trim(both ' + ' from
    coalesce(public._attribute_label(attribute_key), '') ||
    case when attribute_key is not null and specialty_value is not null then ' + ' else '' end ||
    coalesce(specialty_value, '')
  ), '');
$$;

-- =========================================================================
-- _create_roll_request: idempotente por (campanha, sessão, personagem,
-- atributo, especialidade, dificuldade, motivo). Se já existe uma
-- solicitação pendente idêntica, devolve a existente sem inserir outra.
-- Resumo/payload do evento passam a carregar os detalhes do teste.
-- =========================================================================

create or replace function public._create_roll_request(target_campaign uuid, target_character uuid, actor uuid, actor_source text, attribute_value text, specialty_value text, modifier_value integer, reason_value text, difficulty_value integer) returns public.roll_requests
language plpgsql security definer set search_path = '' as $$
declare
  session_row public.campaign_sessions%rowtype;
  created public.roll_requests%rowtype;
  existing public.roll_requests%rowtype;
  character_name text;
  test_label text;
  clean_reason text := coalesce(reason_value, '');
begin
  if not exists(select 1 from public.characters where id = target_character and campaign_id = target_campaign) then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
  select * into session_row from public.campaign_sessions where campaign_id = target_campaign and status = 'active';
  if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_campaign::text || ':roll_requests', 0));

  -- Deduplicação: mesma combinação já pendente devolve a solicitação existente.
  select * into existing from public.roll_requests r
    where r.campaign_id = target_campaign
      and r.session_id is not distinct from session_row.id
      and r.requested_character_id = target_character
      and r.status = 'pending'
      and r.attribute is not distinct from attribute_value
      and r.specialty is not distinct from specialty_value
      and r.difficulty is not distinct from difficulty_value
      and r.reason = clean_reason
    order by r.requested_at asc
    limit 1;
  if found then
    return existing;
  end if;

  insert into public.roll_requests(campaign_id, session_id, requested_character_id, requested_by, attribute, specialty, modifier, reason, difficulty, source)
    values(target_campaign, session_row.id, target_character, actor, attribute_value, specialty_value, coalesce(modifier_value, 0), clean_reason, difficulty_value, actor_source)
    returning * into created;

  select name into character_name from public.characters where id = target_character;
  test_label := public._roll_test_label(attribute_value, specialty_value);

  insert into public.campaign_events(campaign_id, session_id, source, user_id, character_id, event_type, summary, payload)
    values(target_campaign, session_row.id, actor_source, actor, target_character, 'roll_requested',
      left(concat_ws(' — ', character_name, test_label)
        || case when difficulty_value is not null then format(', dificuldade %s', difficulty_value) else '' end, 500),
      jsonb_build_object(
        'roll_request_id', created.id,
        'character_name', character_name,
        'attribute', attribute_value,
        'specialty', specialty_value,
        'difficulty', difficulty_value,
        'modifier', coalesce(modifier_value, 0),
        'reason', clean_reason,
        'test_label', test_label));
  return created;
end; $$;

revoke all on function public._create_roll_request(uuid, uuid, uuid, text, text, text, integer, text, integer) from public;

-- =========================================================================
-- perform_dice_roll: quando vinculada a uma solicitação, herda também o
-- modificador da solicitação (não confia no cliente) e grava um resumo de
-- evento com o teste, a dificuldade, o motivo e o resultado.
-- =========================================================================

create or replace function public.perform_dice_roll(payload jsonb) returns jsonb
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
  reason_value text := '';
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
  test_label text;
  event_summary text;
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
    -- O modificador oficial é o da solicitação; o cliente não pode sobrepô-lo.
    modifier_value := coalesce(request_row.modifier, 0);
    reason_value := coalesce(request_row.reason, '');
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

  test_label := public._roll_test_label(attribute_value, specialty_value);
  if test_label is not null then
    event_summary := format('%s — %s: resultado %s', character_row.name, test_label, total_value)
      || case when difficulty_value is not null then format(' (dificuldade %s)', difficulty_value) else '' end;
  else
    event_summary := format('%s lançou %s%s e obteve %s.', character_row.name, count_value, dice_value, total_value);
  end if;

  insert into public.campaign_events(campaign_id, session_id, source, user_id, character_id, event_type, summary, payload, is_test)
    values(campaign, session_row.id, 'player', uid, character_row.id, 'dice_roll',
      left(event_summary, 500),
      jsonb_build_object('dice', dice_value, 'count', count_value, 'modifier', modifier_value, 'results', results_value, 'total', total_value,
        'outcome', outcome_value, 'label', label_value, 'character_name', character_row.name,
        'attribute', attribute_value, 'specialty', specialty_value, 'difficulty', difficulty_value,
        'reason', reason_value, 'test_label', test_label, 'roll_request_id', roll_request),
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

commit;
