begin;

create or replace function public.perform_dice_roll(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); campaign uuid; request_id uuid; request_row public.roll_requests%rowtype;
  session_row public.campaign_sessions%rowtype; character_row public.characters%rowtype;
  spec jsonb; item jsonb; group_results integer[]; flat_results integer[]:='{}'; groups jsonb:='[]';
  sides integer; quantity integer; rolled_value integer; subtotal_value integer:=0; modifier_value integer:=0;
  total_value integer; outcome_value text; event_row public.campaign_events%rowtype; roll_row public.dice_rolls%rowtype;
  label text; test_label text; i integer; legacy_dice text; legacy_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  begin campaign:=(payload->>'campaign_id')::uuid; request_id:=nullif(payload->>'roll_request_id','')::uuid;
  exception when invalid_text_representation then raise exception 'INVALID_REQUEST' using errcode='22023'; end;
  if campaign is null or not public.is_campaign_member(campaign) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into session_row from public.campaign_sessions where campaign_id=campaign and status='active';
  if not found then raise exception 'SESSION_INACTIVE' using errcode='P0001'; end if;
  if request_id is not null then
    select * into request_row from public.roll_requests where id=request_id and campaign_id=campaign for update;
    if not found or request_row.status<>'pending' then raise exception 'INVALID_TARGET' using errcode='P0002'; end if;
    if request_row.requested_character_id is not null then
      select * into character_row from public.characters where id=request_row.requested_character_id;
      if character_row.owner_id<>uid then raise exception 'NOT_YOUR_CHARACTER' using errcode='42501'; end if;
    else
      select * into character_row from public.characters where campaign_id=campaign and owner_id=uid;
      if not found then raise exception 'NO_CHARACTER_SEATED' using errcode='P0002'; end if;
    end if;
    modifier_value:=request_row.modifier;
    spec:=case when request_row.request_kind='dice_pool' then request_row.dice_spec else '[{"sides":20,"quantity":1}]'::jsonb end;
  else
    select * into character_row from public.characters where campaign_id=campaign and owner_id=uid;
    if not found then raise exception 'NO_CHARACTER_SEATED' using errcode='P0002'; end if;
    legacy_dice:=payload->>'dice'; legacy_count:=coalesce((payload->>'count')::integer,1); modifier_value:=coalesce((payload->>'modifier')::integer,0);
    sides:=case legacy_dice when 'd4' then 4 when 'd6' then 6 when 'd8' then 8 when 'd10' then 10 when 'd12' then 12 when 'd20' then 20 when 'd100' then 100 else null end;
    if sides is null or legacy_count not between 1 and 4 or modifier_value not between -10 and 10 then raise exception 'INVALID_DICE' using errcode='22023'; end if;
    spec:=jsonb_build_array(jsonb_build_object('sides',sides,'quantity',legacy_count));
  end if;
  for item in select die.value from jsonb_array_elements(spec) as die(value) loop
    sides:=(item->>'sides')::integer; quantity:=(item->>'quantity')::integer; group_results:='{}';
    for i in 1..quantity loop
      rolled_value:=(floor(random()*sides)+1)::integer;
      group_results:=group_results||rolled_value; flat_results:=flat_results||rolled_value; subtotal_value:=subtotal_value+rolled_value;
    end loop;
    groups:=groups||jsonb_build_array(jsonb_build_object('sides',sides,'results',to_jsonb(group_results)));
  end loop;
  total_value:=subtotal_value+modifier_value;
  if request_id is not null and request_row.request_kind='character_test' and request_row.difficulty is not null then
    outcome_value:=case when total_value>=request_row.difficulty then 'success' else 'failure' end;
  elsif jsonb_array_length(spec)=1 and (spec->0->>'sides')::integer=20 and (spec->0->>'quantity')::integer=1 then
    outcome_value:=case flat_results[1] when 20 then 'critical_success' when 1 then 'critical_failure' end;
  end if;
  select string_agg((die.item->>'quantity')||'d'||(die.item->>'sides'),' + ' order by die.ordinality)
    into label from jsonb_array_elements(spec) with ordinality as die(item,ordinality);
  test_label:=case when request_row.request_kind='dice_pool' then label else coalesce(public._roll_test_label(request_row.attribute,request_row.specialty),'Teste simples') end;
  insert into public.campaign_events(campaign_id,session_id,source,user_id,character_id,event_type,summary,payload,is_test)
    values(campaign,session_row.id,'player',uid,character_row.id,'dice_roll',
      left(character_row.name||' — '||test_label||case when request_row.difficulty is not null then format(', dificuldade %s',request_row.difficulty) else '' end,500),
      jsonb_build_object('roll_request_id',request_id,'request_kind',coalesce(request_row.request_kind,'character_test'),'dice_spec',spec,'dice_results',groups,'results',flat_results,'subtotal',subtotal_value,'modifier',modifier_value,'total',total_value,'outcome',outcome_value,'character_name',character_row.name,'attribute',request_row.attribute,'specialty',request_row.specialty,'difficulty',request_row.difficulty,'reason',coalesce(request_row.reason,''),'test_label',test_label),
      coalesce((payload->>'is_test')::boolean,false)) returning * into event_row;
  legacy_dice:='d'||(spec->0->>'sides');
  select sum((die.item->>'quantity')::integer) into legacy_count from jsonb_array_elements(spec) as die(item);
  insert into public.dice_rolls(campaign_id,session_id,character_id,rolled_by,roll_request_id,request_kind,dice_spec,dice_results,subtotal,dice,count,modifier,attribute,specialty,difficulty,results,total,outcome,label,is_test,event_id)
    values(campaign,session_row.id,character_row.id,uid,request_id,coalesce(request_row.request_kind,'character_test'),spec,groups,subtotal_value,legacy_dice,legacy_count,modifier_value,request_row.attribute,request_row.specialty,request_row.difficulty,flat_results,total_value,outcome_value,left(label,120),coalesce((payload->>'is_test')::boolean,false),event_row.id) returning * into roll_row;
  if request_id is not null then
    update public.roll_requests set status='completed',completed_at=now(),resulting_roll_id=roll_row.id where id=request_id;
  end if;
  return jsonb_build_object('roll_id',roll_row.id,'event_id',event_row.id,'character_id',character_row.id,'character_name',character_row.name,'request_kind',coalesce(request_row.request_kind,'character_test'),'dice',legacy_dice,'count',legacy_count,'dice_results',groups,'results',flat_results,'subtotal',subtotal_value,'modifier',modifier_value,'total',total_value,'outcome',outcome_value,'is_test',roll_row.is_test);
end; $$;

revoke all on function public.perform_dice_roll(jsonb) from public;
grant execute on function public.perform_dice_roll(jsonb) to authenticated;

commit;
