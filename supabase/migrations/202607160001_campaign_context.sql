begin;

alter table public.campaigns
  add column if not exists status text not null default 'ativa' check (char_length(trim(status)) between 1 and 40),
  add column if not exists premise text not null default '' check (char_length(premise) <= 1200),
  add column if not exists current_summary text not null default '' check (char_length(current_summary) <= 2400),
  add column if not exists current_region_id text check (
    current_region_id is null or current_region_id in (
      'vale-de-ardan',
      'floresta-de-nhalor',
      'costa-quebrada',
      'cordilheira-de-ferro',
      'pantanos-de-varg',
      'deserto-de-sal',
      'mar-de-cinzas',
      'peninsula-da-aurora',
      'estepes-do-norte',
      'arquipelago-de-vesper',
      'ilhas-cinzentas',
      'ormara'
    )
  ),
  add column if not exists last_session_summary text not null default '' check (char_length(last_session_summary) <= 3200),
  add column if not exists active_objectives text[] not null default '{}'::text[] check (cardinality(active_objectives) <= 8),
  add column if not exists important_notes text not null default '' check (char_length(important_notes) <= 3200),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  add column if not exists gpt_master_url text check (
    gpt_master_url is null
    or (
      char_length(gpt_master_url) <= 500
      and gpt_master_url ~* '^https?://'
    )
  );

create table if not exists public.campaign_locations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  region_id text not null check (region_id in (
    'vale-de-ardan',
    'floresta-de-nhalor',
    'costa-quebrada',
    'cordilheira-de-ferro',
    'pantanos-de-varg',
    'deserto-de-sal',
    'mar-de-cinzas',
    'peninsula-da-aurora',
    'estepes-do-norte',
    'arquipelago-de-vesper',
    'ilhas-cinzentas',
    'ormara'
  )),
  kind text,
  x numeric not null default 0.5 check (x >= 0 and x <= 1),
  y numeric not null default 0.5 check (y >= 0 and y <= 1),
  revealed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campaign_id, name, region_id)
);

create index if not exists campaign_locations_campaign_idx on public.campaign_locations(campaign_id);

alter table public.campaign_locations enable row level security;

drop policy if exists campaign_locations_select_members on public.campaign_locations;
create policy campaign_locations_select_members on public.campaign_locations
  for select to authenticated using (public.is_campaign_member(campaign_id));

drop policy if exists campaign_locations_insert_admin on public.campaign_locations;
create policy campaign_locations_insert_admin on public.campaign_locations
  for insert to authenticated with check (public.is_campaign_admin(campaign_id));

drop policy if exists campaign_locations_update_admin on public.campaign_locations;
create policy campaign_locations_update_admin on public.campaign_locations
  for update to authenticated using (public.is_campaign_admin(campaign_id)) with check (public.is_campaign_admin(campaign_id));

drop policy if exists campaign_locations_delete_admin on public.campaign_locations;
create policy campaign_locations_delete_admin on public.campaign_locations
  for delete to authenticated using (public.is_campaign_admin(campaign_id));

alter publication supabase_realtime add table public.campaigns, public.campaign_locations;

commit;
