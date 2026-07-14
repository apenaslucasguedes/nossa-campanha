begin;

create or replace function public.valid_initial_attributes(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ?& array['strength','agility','intellect','presence','instinct']
    and (select count(*) from jsonb_object_keys(value)) = 5
    and (
      select array_agg((entry.value::text)::integer order by (entry.value::text)::integer)
      from jsonb_each(value) entry
    ) = array[0,1,1,2,3];
$$;

commit;
