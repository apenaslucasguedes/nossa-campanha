begin;

create policy characters_delete_owner on public.characters
  for delete to authenticated
  using (owner_id = auth.uid());

commit;
