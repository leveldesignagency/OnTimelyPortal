-- SECURITY DEFINER RPC to check if a guest has already responded to a module
-- Usage: select guest_has_module_answer(p_guest_id := '...', p_module_id := '...', p_event_id := '...');

create or replace function public.guest_has_module_answer(
  p_guest_id uuid,
  p_module_id text,
  p_event_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1
    from public.guest_module_answers gma
    where gma.guest_id = p_guest_id
      and gma.module_id = p_module_id
      and (p_event_id is null or gma.event_id = p_event_id)
  ) into v_exists;
  return coalesce(v_exists, false);
end;
$$;

grant execute on function public.guest_has_module_answer(uuid, text, uuid) to anon, authenticated;
