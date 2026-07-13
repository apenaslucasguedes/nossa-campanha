begin;

create table public.combat_sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  status text not null default 'active' check (status in ('active','ended')),
  round integer not null default 1 check (round > 0),
  turn_index integer not null default 0 check (turn_index >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index combat_sessions_one_active on public.combat_sessions(campaign_id) where status='active';

create table public.enemy_instances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.combat_sessions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  level smallint not null check (level between 1 and 5),
  category text not null check (category in ('lacaio','comum','elite','chefe')),
  archetype text not null check (char_length(trim(archetype)) between 1 and 40),
  vitality integer not null check (vitality >= 0),
  vitality_max integer not null check (vitality_max > 0 and vitality <= vitality_max),
  defense integer not null check (defense > 0),
  attack_bonus integer not null,
  damage_expression text not null check (damage_expression ~ '^\\d+d(4|6|8|10|12|20|100)( \\+ \\d+)?$'),
  effect_difficulty integer not null check (effect_difficulty > 0),
  zone text not null check (zone in ('corpo a corpo','perto','distante','fora de alcance')),
  status text not null default 'ativo' check (status in ('ativo','derrotado','fugiu','aliado')),
  conditions jsonb not null default '[]'::jsonb check (jsonb_typeof(conditions)='array'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.combat_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.combat_sessions(id) on delete cascade,
  character_id uuid references public.characters(id) on delete cascade,
  enemy_instance_id uuid references public.enemy_instances(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  initiative integer not null default 0,
  position integer not null default 0 check (position >= 0),
  zone text not null default 'perto' check (zone in ('corpo a corpo','perto','distante','fora de alcance')),
  conditions jsonb not null default '[]'::jsonb check (jsonb_typeof(conditions)='array'),
  fallen boolean not null default false, stable boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((character_id is not null)::integer + (enemy_instance_id is not null)::integer = 1),
  unique(session_id, character_id), unique(session_id, enemy_instance_id)
);

create table public.game_actions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  session_id uuid references public.combat_sessions(id) on delete cascade,
  action_type text not null check (char_length(action_type) between 1 and 40),
  summary text not null check (char_length(summary) between 1 and 240),
  target_table text check (target_table in ('combat_sessions','combat_participants','enemy_instances','character_states')),
  target_id uuid, before_state jsonb, after_state jsonb,
  reversible boolean not null default false,
  undone_at timestamptz, created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (not reversible or (target_table is not null and target_id is not null and before_state is not null and after_state is not null))
);

create index combat_sessions_campaign_idx on public.combat_sessions(campaign_id);
create index enemies_session_idx on public.enemy_instances(session_id);
create index participants_session_position_idx on public.combat_participants(session_id,position);
create index actions_campaign_created_idx on public.game_actions(campaign_id,created_at desc);

alter table public.combat_sessions enable row level security;
alter table public.enemy_instances enable row level security;
alter table public.combat_participants enable row level security;
alter table public.game_actions enable row level security;
create policy combat_read_members on public.combat_sessions for select to authenticated using (public.is_campaign_member(campaign_id));
create policy combat_write_admin on public.combat_sessions for all to authenticated using (public.is_campaign_admin(campaign_id)) with check (public.is_campaign_admin(campaign_id) and created_by=auth.uid());
create policy enemies_read_members on public.enemy_instances for select to authenticated using (exists(select 1 from public.combat_sessions s where s.id=session_id and public.is_campaign_member(s.campaign_id)));
create policy enemies_write_admin on public.enemy_instances for all to authenticated using (exists(select 1 from public.combat_sessions s where s.id=session_id and public.is_campaign_admin(s.campaign_id))) with check (exists(select 1 from public.combat_sessions s where s.id=session_id and public.is_campaign_admin(s.campaign_id)));
create policy participants_read_members on public.combat_participants for select to authenticated using (exists(select 1 from public.combat_sessions s where s.id=session_id and public.is_campaign_member(s.campaign_id)));
create policy participants_write_admin on public.combat_participants for all to authenticated using (exists(select 1 from public.combat_sessions s where s.id=session_id and public.is_campaign_admin(s.campaign_id))) with check (exists(select 1 from public.combat_sessions s where s.id=session_id and public.is_campaign_admin(s.campaign_id)));
create policy actions_read_members on public.game_actions for select to authenticated using (public.is_campaign_member(campaign_id));
create policy actions_write_admin on public.game_actions for all to authenticated using (public.is_campaign_admin(campaign_id)) with check (public.is_campaign_admin(campaign_id) and created_by=auth.uid());

alter publication supabase_realtime add table public.combat_sessions, public.combat_participants, public.enemy_instances, public.game_actions;
commit;
