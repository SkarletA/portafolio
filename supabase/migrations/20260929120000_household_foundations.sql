-- Household foundations: two users linked by invitation, and mutual read
-- visibility over each other's transactions/payments/budgets/goals/transfers.
-- See docs/adr/007-household-foundations.md.
--
-- Verified against the live database before writing this (pg_policies on
-- transactions, transaction_payments, budgets, goals, goal_transfers): each of
-- transactions, transaction_payments, budgets and goals carries a single FOR
-- ALL policy ("Users manage their own X", role public, using = with check =
-- auth.uid() = user_id). goal_transfers already has separate SELECT/INSERT/
-- DELETE policies. The drops below do not use "if exists" on purpose: if a
-- name differs from what was verified, this aborts instead of silently
-- skipping the rewrite.
--
-- A FOR ALL policy's USING clause gates SELECT, UPDATE and DELETE alike, and
-- DELETE has no WITH CHECK. Widening USING to household visibility without
-- splitting the policy first would let a member delete their partner's rows,
-- not just read them. Every FOR ALL policy below is therefore replaced with
-- four: SELECT widened to the household, INSERT/UPDATE/DELETE left exactly as
-- they were (self only). New policies are scoped "to authenticated" (the
-- existing ones read "public"), a deliberate tightening consistent with every
-- policy already written since ADR-004.
--
-- A household is exactly two people. invite_household_member enforces this by
-- construction (it refuses when either party already has a row), so no
-- separate member-count check is needed. decline/leave dissolve the whole
-- household rather than leave a lone accepted member stuck unable to invite
-- anyone else.

begin;

-- ---------------------------------------------------------------------------
-- Household and membership
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null
    constraint household_members_status_values check (status in ('pending', 'accepted')),
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- One active (pending or accepted) household relationship per user at a time.
create unique index household_members_one_active_per_user
  on public.household_members (user_id)
  where status in ('pending', 'accepted');

create index household_members_household_id_idx on public.household_members (household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- ---------------------------------------------------------------------------
-- Visibility helpers. security definer: they read household_members as the
-- function owner (bypassing its own RLS), the same way apply_goal_transfer
-- and check_goal_balance_non_negative already read/write across the RLS
-- boundary elsewhere in this schema.
-- ---------------------------------------------------------------------------
create function public.current_household_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select household_id
    from public.household_members
   where user_id = auth.uid() and status = 'accepted'
   limit 1
$$;

-- Always includes the caller's own id, whether or not they are in a
-- household: a user with no household, or with only a pending invite, must
-- keep seeing exactly their own rows.
create function public.household_member_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select user_id
    from public.household_members
   where household_id = public.current_household_id() and status = 'accepted'
  union
  select auth.uid()
$$;

revoke execute on function public.current_household_id() from public, anon;
revoke execute on function public.household_member_ids() from public, anon;
grant execute on function public.current_household_id() to authenticated;
grant execute on function public.household_member_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- households / household_members: read only, written only by the RPCs below
-- ---------------------------------------------------------------------------
create policy "Users read their household"
  on public.households for select to authenticated
  using (id = public.current_household_id());

-- A user sees their own membership row (needed for the pending-invite banner
-- before they are an accepted member of anything) plus every row of the
-- household they already belong to (needed to list who's in it).
create policy "Users read their household membership rows"
  on public.household_members for select to authenticated
  using (user_id = auth.uid() or household_id = public.current_household_id());

revoke all on public.households from anon, authenticated;
revoke all on public.household_members from anon, authenticated;
grant select on public.households to authenticated;
grant select on public.household_members to authenticated;

-- ---------------------------------------------------------------------------
-- invite_household_member: creates the household (if the inviter has none)
-- and a pending row for the invitee, resolved by email against auth.users.
-- No account for that email -> user_not_found; this app does not invite
-- people who have not signed up.
-- ---------------------------------------------------------------------------
create function public.invite_household_member(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invitee uuid;
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  select id into v_invitee from auth.users where email = p_email;
  if v_invitee is null then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;

  if v_invitee = v_uid then
    raise exception using errcode = 'P0001', message = 'cannot_invite_self';
  end if;

  -- Lock both users' membership rows, in a fixed order, before checking
  -- either: two concurrent invites naming the same pair cannot both pass.
  perform 1 from public.household_members
   where user_id in (v_uid, v_invitee)
   order by user_id
     for update;

  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception using errcode = 'P0001', message = 'already_in_household';
  end if;

  if exists (select 1 from public.household_members where user_id = v_invitee) then
    raise exception using errcode = 'P0001', message = 'invitee_already_in_household';
  end if;

  insert into public.households (created_by) values (v_uid) returning id into v_household_id;

  insert into public.household_members (household_id, user_id, status, invited_by, accepted_at)
  values (v_household_id, v_uid, 'accepted', v_uid, now());

  insert into public.household_members (household_id, user_id, status, invited_by)
  values (v_household_id, v_invitee, 'pending', v_uid);

  return v_household_id;
end;
$$;

create function public.accept_household_invite()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  select household_id into v_household_id
    from public.household_members
   where user_id = v_uid and status = 'pending'
     for update;

  if v_household_id is null then
    raise exception using errcode = 'P0001', message = 'invite_not_found';
  end if;

  update public.household_members
     set status = 'accepted', accepted_at = now()
   where user_id = v_uid and household_id = v_household_id;

  return v_household_id;
end;
$$;

-- Declining dissolves the household rather than leaving the inviter stuck as
-- a lone accepted member (already_in_household would then block them from
-- ever inviting anyone else).
create function public.decline_household_invite()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  select household_id into v_household_id
    from public.household_members
   where user_id = v_uid and status = 'pending'
     for update;

  if v_household_id is null then
    raise exception using errcode = 'P0001', message = 'invite_not_found';
  end if;

  delete from public.household_members where household_id = v_household_id;
  delete from public.households where id = v_household_id;
end;
$$;

-- Same reasoning as decline: a two-person household dissolves when either
-- member leaves, instead of stranding the other in a household of one.
create function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  select household_id into v_household_id
    from public.household_members
   where user_id = v_uid and status = 'accepted'
     for update;

  if v_household_id is null then
    raise exception using errcode = 'P0001', message = 'not_in_household';
  end if;

  delete from public.household_members where household_id = v_household_id;
  delete from public.households where id = v_household_id;
end;
$$;

revoke execute on function public.invite_household_member(text) from public, anon;
revoke execute on function public.accept_household_invite() from public, anon;
revoke execute on function public.decline_household_invite() from public, anon;
revoke execute on function public.leave_household() from public, anon;
grant execute on function public.invite_household_member(text) to authenticated;
grant execute on function public.accept_household_invite() to authenticated;
grant execute on function public.decline_household_invite() to authenticated;
grant execute on function public.leave_household() to authenticated;

-- ---------------------------------------------------------------------------
-- transactions: SELECT widens to the household; writes stay self-only
-- ---------------------------------------------------------------------------
drop policy "Users manage their own transactions" on public.transactions;

create policy "Users read household transactions"
  on public.transactions for select to authenticated
  using (user_id in (select public.household_member_ids()));

create policy "Users insert their own transactions"
  on public.transactions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update their own transactions"
  on public.transactions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own transactions"
  on public.transactions for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- transaction_payments: same split, so the household sees payment method
-- detail on shared/personal expenses alike (TransactionItem needs this).
-- ---------------------------------------------------------------------------
drop policy "Users manage their own transaction payments" on public.transaction_payments;

create policy "Users read household transaction payments"
  on public.transaction_payments for select to authenticated
  using (user_id in (select public.household_member_ids()));

create policy "Users insert their own transaction payments"
  on public.transaction_payments for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update their own transaction payments"
  on public.transaction_payments for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own transaction payments"
  on public.transaction_payments for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- budgets: same split
-- ---------------------------------------------------------------------------
drop policy "Users manage their own budgets" on public.budgets;

create policy "Users read household budgets"
  on public.budgets for select to authenticated
  using (user_id in (select public.household_member_ids()));

create policy "Users insert their own budgets"
  on public.budgets for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update their own budgets"
  on public.budgets for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own budgets"
  on public.budgets for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- goals: same split
-- ---------------------------------------------------------------------------
drop policy "Users manage their own goals" on public.goals;

create policy "Users read household goals"
  on public.goals for select to authenticated
  using (user_id in (select public.household_member_ids()));

create policy "Users insert their own goals"
  on public.goals for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update their own goals"
  on public.goals for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own goals"
  on public.goals for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- goal_transfers: already split by command; only SELECT widens, so a
-- household member can read the Goal activity behind their partner's
-- transactions (deposits, withdrawals, refunds). Insert/delete are unchanged.
-- ---------------------------------------------------------------------------
drop policy "Users read their own goal transfers" on public.goal_transfers;

create policy "Users read household goal transfers"
  on public.goal_transfers for select to authenticated
  using (user_id in (select public.household_member_ids()));

commit;
