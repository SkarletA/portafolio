-- update_goal: edit a Goal's name, target amount and target date.
-- See docs/adr/004-goal-transfers.md.
--
-- Clients cannot update public.goals directly (revoked in the goal_transfers
-- migration), so edits go through this function, like create_goal.
-- current_amount is deliberately not a parameter and is never written here: it
-- is a cache of goal_transfers, changed only by the apply_goal_transfer trigger.

begin;

create function public.update_goal(
  p_id uuid,
  p_name text,
  p_target_amount numeric,
  p_target_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if p_target_amount is null or p_target_amount <= 0 or p_target_amount <> round(p_target_amount, 2) then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  -- Filtering by user_id means another user's Goal is reported as not found,
  -- the same as one that does not exist.
  update public.goals
     set name = p_name,
         target_amount = p_target_amount,
         target_date = p_target_date
   where id = p_id
     and user_id = v_uid;

  if not found then
    raise exception using errcode = 'P0001', message = 'goal_not_found';
  end if;
end;
$$;

revoke execute on function public.update_goal(uuid, text, numeric, date) from public, anon;
grant execute on function public.update_goal(uuid, text, numeric, date) to authenticated;

commit;
