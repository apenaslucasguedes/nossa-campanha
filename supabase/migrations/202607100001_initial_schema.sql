begin;

create type public.member_role as enum ('player', 'table_admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'player',
  seat smallint not null check (seat between 1 and 2),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id),
  unique (campaign_id, seat)
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 80),
  class_key text not null check (class_key ~ '^class_[1-6]$'),
  level smallint not null default 1 check (level between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, owner_id)
);

create table public.character_states (
  character_id uuid primary key references public.characters(id) on delete cascade,
  vitality_current integer not null check (vitality_current >= 0),
  vitality_max integer not null check (vitality_max > 0 and vitality_current <= vitality_max),
  resource_current integer not null default 0 check (resource_current >= 0),
  resource_max integer not null default 0 check (resource_max >= 0 and resource_current <= resource_max),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict
);

create table public.character_conditions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (character_id, name)
);

create index campaign_members_user_idx on public.campaign_members(user_id);
create index characters_campaign_idx on public.characters(campaign_id);
create index characters_owner_idx on public.characters(owner_id);
create index character_conditions_character_idx on public.character_conditions(character_id);

create function public.is_campaign_member(target_campaign uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.campaign_members cm where cm.campaign_id = target_campaign and cm.user_id = auth.uid());
$$;
create function public.is_campaign_admin(target_campaign uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.campaign_members cm where cm.campaign_id = target_campaign and cm.user_id = auth.uid() and cm.role = 'table_admin');
$$;
create function public.can_edit_character(target_character uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.characters c where c.id = target_character and (c.owner_id = auth.uid() or public.is_campaign_admin(c.campaign_id)));
$$;
create function public.shares_campaign_with(target_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.campaign_members mine join public.campaign_members theirs on theirs.campaign_id = mine.campaign_id where mine.user_id = auth.uid() and theirs.user_id = target_user);
$$;
revoke all on function public.is_campaign_member(uuid), public.is_campaign_admin(uuid), public.can_edit_character(uuid), public.shares_campaign_with(uuid) from public;
grant execute on function public.is_campaign_member(uuid), public.is_campaign_admin(uuid), public.can_edit_character(uuid), public.shares_campaign_with(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.character_states enable row level security;
alter table public.character_conditions enable row level security;

create policy profiles_select_shared on public.profiles for select to authenticated using (id = auth.uid() or public.shares_campaign_with(id));
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy campaigns_select_members on public.campaigns for select to authenticated using (public.is_campaign_member(id));
create policy campaigns_update_admin on public.campaigns for update to authenticated using (public.is_campaign_admin(id)) with check (public.is_campaign_admin(id));
create policy members_select_campaign on public.campaign_members for select to authenticated using (public.is_campaign_member(campaign_id));
create policy characters_select_campaign on public.characters for select to authenticated using (public.is_campaign_member(campaign_id));
create policy characters_insert_authorized on public.characters for insert to authenticated with check (public.is_campaign_member(campaign_id) and (owner_id = auth.uid() or public.is_campaign_admin(campaign_id)));
create policy characters_update_authorized on public.characters for update to authenticated using (owner_id = auth.uid() or public.is_campaign_admin(campaign_id)) with check (owner_id = auth.uid() or public.is_campaign_admin(campaign_id));
create policy states_select_campaign on public.character_states for select to authenticated using (exists(select 1 from public.characters c where c.id = character_id and public.is_campaign_member(c.campaign_id)));
create policy states_insert_authorized on public.character_states for insert to authenticated with check (public.can_edit_character(character_id) and updated_by = auth.uid());
create policy states_update_authorized on public.character_states for update to authenticated using (public.can_edit_character(character_id)) with check (public.can_edit_character(character_id) and updated_by = auth.uid());
create policy conditions_select_campaign on public.character_conditions for select to authenticated using (exists(select 1 from public.characters c where c.id = character_id and public.is_campaign_member(c.campaign_id)));
create policy conditions_insert_authorized on public.character_conditions for insert to authenticated with check (public.can_edit_character(character_id) and created_by = auth.uid());
create policy conditions_delete_authorized on public.character_conditions for delete to authenticated using (public.can_edit_character(character_id));

alter publication supabase_realtime add table public.character_states, public.character_conditions;
commit;
