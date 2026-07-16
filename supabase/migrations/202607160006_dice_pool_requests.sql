begin;

alter table public.roll_requests drop constraint if exists roll_requests_needs_facet;
alter table public.roll_requests alter column requested_character_id drop not null;
alter table public.roll_requests add column request_kind text not null default 'character_test'
  check (request_kind in ('character_test','dice_pool'));
alter table public.roll_requests add column dice_spec jsonb;
alter table public.roll_requests add constraint roll_requests_kind_shape check (
  (request_kind='character_test' and requested_character_id is not null and dice_spec is null)
  or (request_kind='dice_pool' and dice_spec is not null)
);

alter table public.dice_rolls add column request_kind text not null default 'character_test'
  check (request_kind in ('character_test','dice_pool'));
alter table public.dice_rolls add column dice_spec jsonb;
alter table public.dice_rolls add column dice_results jsonb;
alter table public.dice_rolls add column subtotal integer;
update public.dice_rolls set subtotal=total-modifier where subtotal is null;
alter table public.dice_rolls alter column subtotal set not null;
alter table public.dice_rolls drop constraint if exists dice_rolls_count_check;
alter table public.dice_rolls add constraint dice_rolls_count_check check (count between 1 and 20);
alter table public.dice_rolls drop constraint if exists dice_rolls_modifier_check;
alter table public.dice_rolls add constraint dice_rolls_modifier_check check (modifier between -20 and 20);

create or replace function public._validate_dice_spec(spec jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare item jsonb; total_count integer:=0; sides_value integer; quantity_value integer;
begin
  if jsonb_typeof(spec)<>'array' or jsonb_array_length(spec)<1 or jsonb_array_length(spec)>7 then return false; end if;
  for item in select value from jsonb_array_elements(spec) loop
    if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2 or not item ?& array['sides','quantity'] then return false; end if;
    begin sides_value:=(item->>'sides')::integer; quantity_value:=(item->>'quantity')::integer;
    exception when others then return false; end;
    if sides_value not in (4,6,8,10,12,20,100) or quantity_value<1 then return false; end if;
    total_count:=total_count+quantity_value;
  end loop;
  return total_count<=20;
end; $$;

create or replace function public._create_roll_request(target_campaign uuid,target_character uuid,actor uuid,actor_source text,attribute_value text,specialty_value text,modifier_value integer,reason_value text,difficulty_value integer) returns public.roll_requests
language plpgsql security definer set search_path='' as $$
declare session_row public.campaign_sessions%rowtype; created public.roll_requests%rowtype; existing public.roll_requests%rowtype; character_name text; test_label text; clean_reason text:=coalesce(reason_value,'');
begin
  if not exists(select 1 from public.characters where id=target_character and campaign_id=target_campaign) then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
  if coalesce(modifier_value,0) not between -10 and 10 or difficulty_value is not null and difficulty_value not between 1 and 30 then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  select * into session_row from public.campaign_sessions where campaign_id=target_campaign and status='active';
  if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_campaign::text||':roll_requests',0));
  select * into existing from public.roll_requests r where r.campaign_id=target_campaign and r.session_id is not distinct from session_row.id and r.request_kind='character_test' and r.requested_character_id=target_character and r.status='pending' and r.attribute is not distinct from attribute_value and r.specialty is not distinct from specialty_value and r.difficulty is not distinct from difficulty_value and r.modifier=coalesce(modifier_value,0) and r.reason=clean_reason order by r.requested_at limit 1;
  if found then return existing; end if;
  insert into public.roll_requests(campaign_id,session_id,requested_character_id,requested_by,request_kind,attribute,specialty,modifier,reason,difficulty,source)
    values(target_campaign,session_row.id,target_character,actor,'character_test',attribute_value,specialty_value,coalesce(modifier_value,0),clean_reason,difficulty_value,actor_source) returning * into created;
  select name into character_name from public.characters where id=target_character;
  test_label:=coalesce(public._roll_test_label(attribute_value,specialty_value),'Teste simples');
  insert into public.campaign_events(campaign_id,session_id,source,user_id,character_id,event_type,summary,payload)
    values(target_campaign,session_row.id,actor_source,actor,target_character,'roll_requested',left(character_name||' — '||test_label||case when difficulty_value is not null then format(', dificuldade %s',difficulty_value) else '' end,500),jsonb_build_object('roll_request_id',created.id,'request_kind','character_test','character_name',character_name,'attribute',attribute_value,'specialty',specialty_value,'difficulty',difficulty_value,'modifier',coalesce(modifier_value,0),'reason',clean_reason,'test_label',test_label));
  return created;
end; $$;

create or replace function public._create_dice_pool_request(target_campaign uuid,target_character uuid,actor uuid,actor_source text,spec jsonb,modifier_value integer,reason_value text) returns public.roll_requests
language plpgsql security definer set search_path='' as $$
declare session_row public.campaign_sessions%rowtype; created public.roll_requests%rowtype; existing public.roll_requests%rowtype; clean_reason text:=coalesce(reason_value,''); label text;
begin
  if not public._validate_dice_spec(spec) or coalesce(modifier_value,0) not between -20 and 20 then raise exception 'INVALID_DICE' using errcode='22023'; end if;
  if target_character is not null and not exists(select 1 from public.characters where id=target_character and campaign_id=target_campaign) then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
  select * into session_row from public.campaign_sessions where campaign_id=target_campaign and status='active'; if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_campaign::text||':roll_requests',0));
  select * into existing from public.roll_requests r where r.campaign_id=target_campaign and r.session_id is not distinct from session_row.id and r.request_kind='dice_pool' and r.requested_character_id is not distinct from target_character and r.status='pending' and r.dice_spec=spec and r.modifier=coalesce(modifier_value,0) and r.reason=clean_reason order by r.requested_at limit 1;
  if found then return existing; end if;
  insert into public.roll_requests(campaign_id,session_id,requested_character_id,requested_by,request_kind,dice_spec,modifier,reason,source) values(target_campaign,session_row.id,target_character,actor,'dice_pool',spec,coalesce(modifier_value,0),clean_reason,actor_source) returning * into created;
  select string_agg((item->>'quantity')||'d'||(item->>'sides'),' + ' order by ordinality) into label from jsonb_array_elements(spec) with ordinality as d(item,ordinality);
  insert into public.campaign_events(campaign_id,session_id,source,user_id,character_id,event_type,summary,payload) values(target_campaign,session_row.id,actor_source,actor,target_character,'roll_requested',left('Dados livres — '||label,500),jsonb_build_object('roll_request_id',created.id,'request_kind','dice_pool','dice_spec',spec,'modifier',coalesce(modifier_value,0),'reason',clean_reason,'test_label',label));
  return created;
end; $$;

create or replace function public.request_dice_pool(payload jsonb) returns public.roll_requests language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); campaign uuid; target uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  begin campaign:=(payload->>'campaign_id')::uuid; target:=nullif(payload->>'character_id','')::uuid; exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if not public.is_campaign_admin(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return public._create_dice_pool_request(campaign,target,uid,coalesce(payload->>'source','admin'),payload->'dice',coalesce((payload->>'modifier')::integer,0),coalesce(payload->>'reason',''));
end; $$;
revoke all on function public.request_dice_pool(jsonb) from public; grant execute on function public.request_dice_pool(jsonb) to authenticated;

create or replace function public.request_dice_pool_for_gpt(lookup_key_hash text,payload jsonb) returns public.roll_requests language plpgsql security definer set search_path='' as $$
declare campaign uuid; actor uuid; requested uuid; target uuid;
begin
  select t.campaign_id,t.granted_by into campaign,actor from public.authenticate_gpt_key(lookup_key_hash,'request_roll') t;
  begin requested:=nullif(payload->>'campaign_id','')::uuid; target:=nullif(payload->>'character_id','')::uuid; exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if requested is not null and requested<>campaign then raise exception 'CAMPAIGN_MISMATCH' using errcode='42501'; end if;
  return public._create_dice_pool_request(campaign,target,actor,'gpt',payload->'dice',coalesce((payload->>'modifier')::integer,0),coalesce(payload->>'reason',''));
end; $$;
revoke all on function public.request_dice_pool_for_gpt(text,jsonb) from public; grant execute on function public.request_dice_pool_for_gpt(text,jsonb) to anon,authenticated;

create or replace function public.perform_dice_roll(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); campaign uuid; request_id uuid; request_row public.roll_requests%rowtype; session_row public.campaign_sessions%rowtype; character_row public.characters%rowtype; spec jsonb; item jsonb; group_results integer[]; flat_results integer[]:='{}'; groups jsonb:='[]'; sides integer; quantity integer; value integer; subtotal_value integer:=0; modifier_value integer:=0; total_value integer; outcome_value text; event_row public.campaign_events%rowtype; roll_row public.dice_rolls%rowtype; label text; i integer; legacy_dice text; legacy_count integer; actor_character uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  begin campaign:=(payload->>'campaign_id')::uuid; request_id:=nullif(payload->>'roll_request_id','')::uuid; exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if campaign is null or not public.is_campaign_member(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into session_row from public.campaign_sessions where campaign_id=campaign and status='active'; if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;
  if request_id is not null then
    select * into request_row from public.roll_requests where id=request_id and campaign_id=campaign for update;
    if not found or request_row.status<>'pending' then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
    if request_row.requested_character_id is not null then select * into character_row from public.characters where id=request_row.requested_character_id; if character_row.owner_id<>uid then raise exception 'NOT_YOUR_CHARACTER' using errcode='42501'; end if;
    else select * into character_row from public.characters where campaign_id=campaign and owner_id=uid; if not found then raise exception 'NO_CHARACTER_SEATED' using errcode='P0002'; end if; end if;
    modifier_value:=request_row.modifier;
    spec:=case when request_row.request_kind='dice_pool' then request_row.dice_spec else '[{"sides":20,"quantity":1}]'::jsonb end;
  else
    select * into character_row from public.characters where campaign_id=campaign and owner_id=uid; if not found then raise exception 'NO_CHARACTER_SEATED' using errcode='P0002'; end if;
    legacy_dice:=payload->>'dice'; legacy_count:=coalesce((payload->>'count')::integer,1); modifier_value:=coalesce((payload->>'modifier')::integer,0);
    sides:=case legacy_dice when 'd4' then 4 when 'd6' then 6 when 'd8' then 8 when 'd10' then 10 when 'd12' then 12 when 'd20' then 20 when 'd100' then 100 else null end;
    if sides is null or legacy_count not between 1 and 4 or modifier_value not between -10 and 10 then raise exception 'INVALID_DICE' using errcode='22023'; end if;
    spec:=jsonb_build_array(jsonb_build_object('sides',sides,'quantity',legacy_count));
  end if;
  for item in select value from jsonb_array_elements(spec) loop
    sides:=(item->>'sides')::integer; quantity:=(item->>'quantity')::integer; group_results:='{}';
    for i in 1..quantity loop value:=(floor(random()*sides)+1)::integer; group_results:=group_results||value; flat_results:=flat_results||value; subtotal_value:=subtotal_value+value; end loop;
    groups:=groups||jsonb_build_array(jsonb_build_object('sides',sides,'results',to_jsonb(group_results)));
  end loop;
  total_value:=subtotal_value+modifier_value;
  if request_id is not null and request_row.request_kind='character_test' and request_row.difficulty is not null then outcome_value:=case when total_value>=request_row.difficulty then 'success' else 'failure' end; elsif jsonb_array_length(spec)=1 and (spec->0->>'sides')::integer=20 and (spec->0->>'quantity')::integer=1 then outcome_value:=case flat_results[1] when 20 then 'critical_success' when 1 then 'critical_failure' end; end if;
  select string_agg((x->>'quantity')||'d'||(x->>'sides'),' + ' order by ordinality) into label from jsonb_array_elements(spec) with ordinality d(x,ordinality);
  insert into public.campaign_events(campaign_id,session_id,source,user_id,character_id,event_type,summary,payload,is_test) values(campaign,session_row.id,'player',uid,character_row.id,'dice_roll',left(character_row.name||' — '||label||': total '||total_value,500),jsonb_build_object('roll_request_id',request_id,'request_kind',coalesce(request_row.request_kind,'character_test'),'dice_spec',spec,'dice_results',groups,'results',flat_results,'subtotal',subtotal_value,'modifier',modifier_value,'total',total_value,'outcome',outcome_value,'character_name',character_row.name,'attribute',request_row.attribute,'specialty',request_row.specialty,'difficulty',request_row.difficulty,'reason',coalesce(request_row.reason,''),'test_label',case when request_row.request_kind='dice_pool' then label else coalesce(public._roll_test_label(request_row.attribute,request_row.specialty),'Teste simples') end),coalesce((payload->>'is_test')::boolean,false)) returning * into event_row;
  legacy_dice:='d'||(spec->0->>'sides'); legacy_count:=(select sum((x->>'quantity')::integer) from jsonb_array_elements(spec) x);
  insert into public.dice_rolls(campaign_id,session_id,character_id,rolled_by,roll_request_id,request_kind,dice_spec,dice_results,subtotal,dice,count,modifier,attribute,specialty,difficulty,results,total,outcome,label,is_test,event_id) values(campaign,session_row.id,character_row.id,uid,request_id,coalesce(request_row.request_kind,'character_test'),spec,groups,subtotal_value,legacy_dice,legacy_count,modifier_value,request_row.attribute,request_row.specialty,request_row.difficulty,flat_results,total_value,outcome_value,left(label,120),coalesce((payload->>'is_test')::boolean,false),event_row.id) returning * into roll_row;
  if request_id is not null then update public.roll_requests set status='completed',completed_at=now(),resulting_roll_id=roll_row.id where id=request_id; end if;
  return jsonb_build_object('roll_id',roll_row.id,'event_id',event_row.id,'character_id',character_row.id,'character_name',character_row.name,'request_kind',coalesce(request_row.request_kind,'character_test'),'dice',legacy_dice,'count',legacy_count,'dice_results',groups,'results',flat_results,'subtotal',subtotal_value,'modifier',modifier_value,'total',total_value,'outcome',outcome_value,'is_test',roll_row.is_test);
end; $$;
revoke all on function public.perform_dice_roll(jsonb) from public; grant execute on function public.perform_dice_roll(jsonb) to authenticated;

commit;
