begin;

-- =========================================================================
-- list_gpt_campaign_connections — leitura administrativa das conexões GPT
-- de uma campanha, sem nunca expor key_hash.
-- =========================================================================

create function public.list_gpt_campaign_connections(p_campaign_id uuid) returns table(
  id uuid,
  campaign_id uuid,
  label text,
  permissions text[],
  created_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_campaign_admin(p_campaign_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query
    select c.id, c.campaign_id, c.label, c.permissions, c.created_at, c.last_used_at, c.revoked_at
    from public.gpt_campaign_connections c
    where c.campaign_id = p_campaign_id
    order by c.created_at desc;
end; $$;

revoke all on function public.list_gpt_campaign_connections(uuid) from public;
grant execute on function public.list_gpt_campaign_connections(uuid) to authenticated;

commit;
