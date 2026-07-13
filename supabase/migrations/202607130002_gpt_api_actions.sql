begin;

alter table public.game_actions
  add column request_id uuid,
  add column result jsonb;

create unique index game_actions_campaign_request_uidx
  on public.game_actions(campaign_id, request_id)
  where request_id is not null;

create function public.apply_game_action_v1(payload jsonb) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  campaign uuid;
  request uuid;
  action jsonb := payload->'action';
  kind text := action->>'type';
  target uuid;
  amount integer;
  session public.combat_sessions%rowtype;
  state public.character_states%rowtype;
  enemy public.enemy_instances%rowtype;
  character_class text;
  expected_resource text;
  before_value integer;
  after_value integer;
  participant_count integer;
  action_id uuid;
  result_value jsonb;
  summary_value text;
  existing public.game_actions%rowtype;
  enemy_vitality integer;
  enemy_defense integer;
  enemy_attack integer;
  enemy_damage text;
  enemy_difficulty integer;
  multiplier numeric;
begin
  if uid is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  begin campaign := (payload->>'campaign_id')::uuid; request := (payload->>'request_id')::uuid;
  exception when invalid_text_representation then raise exception 'INVALID_ACTION' using errcode='22023'; end;
  if campaign is null or request is null or kind is null then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
  if not public.is_campaign_member(campaign) then raise exception 'CAMPAIGN_NOT_FOUND' using errcode='P0002'; end if;
  if not public.is_campaign_admin(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(campaign::text || ':' || request::text, 0));
  select * into existing from public.game_actions where campaign_id=campaign and request_id=request;
  if found then
    return jsonb_build_object('action_id',existing.id,'duplicate',true,'action_type',existing.action_type,'result',existing.result,'summary',existing.summary);
  end if;

  if kind in ('apply_damage','apply_healing') then
    amount := (action->>'amount')::integer;
    if amount is null or amount <= 0 or amount > 100000 then raise exception 'LIMIT_EXCEEDED' using errcode='22003'; end if;
    target := case when kind='apply_healing' then (action->>'character_id')::uuid else (action->>'target_id')::uuid end;
    if kind='apply_damage' and action->>'target_kind'='enemy' then
      select e.* into enemy from public.enemy_instances e join public.combat_sessions s on s.id=e.session_id where e.id=target and s.campaign_id=campaign for update of e;
      if not found then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
      before_value:=enemy.vitality; after_value:=greatest(0,before_value-amount);
      update public.enemy_instances set vitality=after_value,status=case when after_value=0 then 'derrotado' else status end,updated_at=now() where id=target;
      summary_value:=format('%s sofreu %s de dano.',enemy.name,before_value-after_value);
      result_value:=jsonb_build_object('target_kind','enemy','target_id',target,'vitality_before',before_value,'vitality_after',after_value);
    else
      select cs.* into state from public.character_states cs join public.characters c on c.id=cs.character_id where cs.character_id=target and c.campaign_id=campaign for update of cs;
      if not found then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
      before_value:=state.vitality_current;
      after_value:=case when kind='apply_damage' then greatest(0,before_value-amount) else least(state.vitality_max,before_value+amount) end;
      update public.character_states set vitality_current=after_value,updated_by=uid,updated_at=now() where character_id=target;
      summary_value:=case when kind='apply_damage' then format('Personagem sofreu %s de dano.',before_value-after_value) else format('Personagem recuperou %s de Vitalidade.',after_value-before_value) end;
      result_value:=jsonb_build_object('target_kind','character','character_id',target,'vitality_before',before_value,'vitality_after',after_value,'vitality_max',state.vitality_max);
    end if;

  elsif kind in ('spend_resource','restore_resource') then
    target:=(action->>'character_id')::uuid; amount:=(action->>'amount')::integer;
    if amount is null or amount <= 0 or amount > 100000 then raise exception 'LIMIT_EXCEEDED' using errcode='22003'; end if;
    select cs,c.class_key into state,character_class from public.character_states cs join public.characters c on c.id=cs.character_id where cs.character_id=target and c.campaign_id=campaign for update of cs;
    if not found then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
    expected_resource:=case character_class when 'warrior' then 'Vigor' when 'arcanist' then 'Foco' when 'shadow_blade' then 'Ímpeto' when 'necromancer' then 'Essência' when 'bard' then 'Inspiração' when 'druid' then 'Seiva' end;
    if action->>'resource' is distinct from expected_resource then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
    before_value:=state.resource_current;
    after_value:=case when kind='spend_resource' then before_value-amount else before_value+amount end;
    if after_value<0 or after_value>state.resource_max then raise exception 'LIMIT_EXCEEDED' using errcode='22003'; end if;
    update public.character_states set resource_current=after_value,updated_by=uid,updated_at=now() where character_id=target;
    summary_value:=format('%s alterado de %s para %s.',expected_resource,before_value,after_value);
    result_value:=jsonb_build_object('character_id',target,'resource',expected_resource,'resource_before',before_value,'resource_after',after_value,'resource_max',state.resource_max);

  elsif kind in ('add_condition','remove_condition') then
    target:=(action->>'character_id')::uuid;
    if action->>'condition' not in ('Ferido','Exausto','Amedrontado','Envenenado','Imobilizado','Desorientado','Corrompido','Caído') then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
    if not exists(select 1 from public.characters where id=target and campaign_id=campaign) then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
    if kind='add_condition' then
      insert into public.character_conditions(character_id,name,created_by) values(target,action->>'condition',uid) on conflict(character_id,name) do nothing;
      if not found then raise exception 'CONFLICT' using errcode='23505'; end if;
      summary_value:=format('Condição %s adicionada.',action->>'condition');
    else
      delete from public.character_conditions where character_id=target and name=action->>'condition';
      if not found then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
      summary_value:=format('Condição %s removida.',action->>'condition');
    end if;
    result_value:=jsonb_build_object('character_id',target,'condition',action->>'condition');

  elsif kind='start_combat' then
    if exists(select 1 from public.combat_sessions where campaign_id=campaign and status='active') then raise exception 'CONFLICT' using errcode='23505'; end if;
    insert into public.combat_sessions(campaign_id,created_by) values(campaign,uid) returning * into session;
    insert into public.combat_participants(session_id,character_id,display_name,position,initiative,zone)
      select session.id,c.id,c.name,row_number() over(order by c.created_at)-1,0,'perto' from public.characters c where c.campaign_id=campaign;
    summary_value:='Combate iniciado.';result_value:=jsonb_build_object('session_id',session.id,'round',1,'turn_index',0);

  elsif kind in ('end_combat','advance_turn','advance_round','create_enemy','update_enemy','defeat_enemy') then
    select * into session from public.combat_sessions where campaign_id=campaign and status='active' for update;
    if not found then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
    if kind='end_combat' then
      update public.combat_sessions set status='ended',ended_at=now(),updated_at=now() where id=session.id;
      summary_value:='Combate encerrado.';result_value:=jsonb_build_object('session_id',session.id,'status','ended');
    elsif kind='advance_turn' then
      select count(*) into participant_count from public.combat_participants where session_id=session.id;
      if participant_count=0 then raise exception 'CONFLICT' using errcode='P0001'; end if;
      after_value:=session.turn_index+1;
      if after_value>=participant_count then update public.combat_sessions set turn_index=0,round=round+1,updated_at=now() where id=session.id returning round into before_value; else update public.combat_sessions set turn_index=after_value,updated_at=now() where id=session.id;before_value:=session.round; end if;
      summary_value:='Turno avançado.';result_value:=jsonb_build_object('session_id',session.id,'round',before_value,'turn_index',case when after_value>=participant_count then 0 else after_value end);
    elsif kind='advance_round' then
      update public.combat_sessions set round=round+1,turn_index=0,updated_at=now() where id=session.id returning round into after_value;
      summary_value:='Rodada avançada.';result_value:=jsonb_build_object('session_id',session.id,'round',after_value,'turn_index',0);
    elsif kind='create_enemy' then
      if length(trim(action->>'name')) not between 1 and 60 or (action->>'level')::integer not between 1 and 5 or action->>'category' not in ('lacaio','comum','elite','chefe') or length(trim(action->>'archetype')) not between 1 and 40 or action->>'zone' not in ('corpo a corpo','perto','distante','fora de alcance') then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
      amount:=(action->>'level')::integer;multiplier:=case action->>'category' when 'lacaio' then .5 when 'elite' then 2 when 'chefe' then 3 else 1 end;
      enemy_vitality:=greatest(1,round((array[8,11,15,19,24])[amount]*multiplier));enemy_defense:=(array[11,12,13,14,15])[amount]+case when action->>'category'='lacaio' then -1 when action->>'category'='comum' then 0 else 1 end;enemy_attack:=(array[3,4,5,6,7])[amount]+case when action->>'category'='elite' then 1 when action->>'category'='chefe' then 2 else 0 end;enemy_damage:=(array['1d6 + 1','1d6 + 2','1d8 + 2','1d8 + 3','1d10 + 3'])[amount];enemy_difficulty:=(array[11,12,13,14,15])[amount];
      insert into public.enemy_instances(session_id,name,level,category,archetype,vitality,vitality_max,defense,attack_bonus,damage_expression,effect_difficulty,zone) values(session.id,trim(action->>'name'),amount,action->>'category',trim(action->>'archetype'),enemy_vitality,enemy_vitality,enemy_defense,enemy_attack,enemy_damage,enemy_difficulty,action->>'zone') returning * into enemy;
      insert into public.combat_participants(session_id,enemy_instance_id,display_name,position,zone) values(session.id,enemy.id,enemy.name,(select coalesce(max(position),-1)+1 from public.combat_participants where session_id=session.id),enemy.zone);
      summary_value:=format('%s entrou no combate.',enemy.name);result_value:=jsonb_build_object('enemy_id',enemy.id,'session_id',session.id,'vitality',enemy.vitality,'vitality_max',enemy.vitality_max);
    else
      target:=(action->>'enemy_id')::uuid;select e.* into enemy from public.enemy_instances e where e.id=target and e.session_id=session.id for update;
      if not found then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
      if kind='defeat_enemy' then update public.enemy_instances set vitality=0,status='derrotado',updated_at=now() where id=target;summary_value:=format('%s foi derrotado.',enemy.name);result_value:=jsonb_build_object('enemy_id',target,'vitality',0,'status','derrotado');
      else
        if action ? 'name' and length(trim(action->>'name')) not between 1 and 60 then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
        if action ? 'zone' and action->>'zone' not in ('corpo a corpo','perto','distante','fora de alcance') then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
        if action ? 'status' and action->>'status' not in ('ativo','fugiu','aliado') then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
        update public.enemy_instances set name=coalesce(nullif(trim(action->>'name'),''),name),zone=coalesce(action->>'zone',zone),status=coalesce(action->>'status',status),updated_at=now() where id=target;
        update public.combat_participants set display_name=coalesce(nullif(trim(action->>'name'),''),display_name),zone=coalesce(action->>'zone',zone),updated_at=now() where enemy_instance_id=target;
        summary_value:=format('%s foi atualizado.',enemy.name);result_value:=jsonb_build_object('enemy_id',target);
      end if;
    end if;
  else raise exception 'INVALID_ACTION' using errcode='22023';
  end if;

  insert into public.game_actions(campaign_id,session_id,action_type,summary,target_table,target_id,before_state,after_state,reversible,created_by,request_id,result)
    values(campaign,case when session.id is null then null else session.id end,kind,summary_value,null,null,null,null,false,uid,request,result_value)
    returning id into action_id;
  return jsonb_build_object('action_id',action_id,'duplicate',false,'action_type',kind,'result',result_value,'summary',summary_value);
exception
  when invalid_text_representation then raise exception 'INVALID_ACTION' using errcode='22023';
end;
$$;

revoke all on function public.apply_game_action_v1(jsonb) from public;
grant execute on function public.apply_game_action_v1(jsonb) to authenticated;

commit;
