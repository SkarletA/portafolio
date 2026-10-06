-- ADR-012, PR 1: the three recurring-expense tables, their CHECKs and indexes,
-- the household select policies (ADR-007) and the grants. No function and no
-- cron job here: the write RPCs (PR 3) and the posting job (PR 3) come later.
-- transactions does not change.

begin;

-- Identity and schedule. One row per template.
create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  frequency text not null default 'monthly',
  day_of_month integer not null,
  start_on date not null,
  -- Set by cancel_recurring_expense, which accepts ended_on = today while
  -- start_on is tomorrow, so no CHECK relates ended_on and start_on.
  ended_on date,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  constraint recurring_expenses_frequency_monthly check (frequency = 'monthly'),
  constraint recurring_expenses_day_of_month_range check (day_of_month between 1 and 31)
);

-- Editable terms, versioned by effective_from. Editing adds a row; posted
-- charges keep the version in force on their scheduled date.
create table public.recurring_expense_terms (
  id uuid primary key default gen_random_uuid(),
  recurring_expense_id uuid not null references public.recurring_expenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_from date not null,
  description text not null,
  -- ADR-005, Amendment 2: unconstrained numeric with CHECKs, never numeric(12,2),
  -- which would round an excess decimal silently.
  amount numeric not null,
  category_id uuid references public.categories (id),
  payment_method text not null,
  created_at timestamptz not null default now(),
  constraint recurring_expense_terms_version_unique unique (recurring_expense_id, effective_from),
  constraint recurring_expense_terms_description_present check (btrim(description) <> ''),
  constraint recurring_expense_terms_payment_method_present check (btrim(payment_method) <> ''),
  constraint recurring_expense_terms_amount_positive check (amount > 0),
  constraint recurring_expense_terms_amount_two_decimals check (amount = round(amount, 2)),
  constraint recurring_expense_terms_amount_cap check (amount < 10000000000)
);

-- One row per scheduled date. The scheduled date is the identity of the
-- occurrence. transaction_id is cleared when the user deletes the charge, and
-- the row stays, so the date is never posted again.
create table public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  recurring_expense_id uuid not null references public.recurring_expenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scheduled_date date not null,
  term_version_id uuid not null references public.recurring_expense_terms (id),
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recurring_occurrences_date_unique unique (recurring_expense_id, scheduled_date),
  constraint recurring_occurrences_transaction_unique unique (transaction_id)
);

create index recurring_expenses_user_id_idx on public.recurring_expenses (user_id);
create index recurring_expense_terms_user_id_idx on public.recurring_expense_terms (user_id);
create index recurring_occurrences_user_id_idx on public.recurring_occurrences (user_id);

-- Row level security, following ADR-007: the owner and an accepted partner can
-- read. Nobody writes these tables directly; every write goes through an RPC
-- that checks auth.uid() = user_id (ADR-012, decision 10).
alter table public.recurring_expenses enable row level security;
alter table public.recurring_expense_terms enable row level security;
alter table public.recurring_occurrences enable row level security;

create policy "Users read household recurring expenses"
  on public.recurring_expenses for select to authenticated
  using (user_id in (select public.household_member_ids()));

create policy "Users read household recurring expense terms"
  on public.recurring_expense_terms for select to authenticated
  using (user_id in (select public.household_member_ids()));

create policy "Users read household recurring occurrences"
  on public.recurring_occurrences for select to authenticated
  using (user_id in (select public.household_member_ids()));

-- Supabase grants new public tables to anon and authenticated by default.
-- Revoke everything, then give back SELECT to authenticated only, as
-- transaction_shares does (ADR-009).
revoke all on public.recurring_expenses, public.recurring_expense_terms, public.recurring_occurrences
  from anon, authenticated;
grant select on public.recurring_expenses, public.recurring_expense_terms, public.recurring_occurrences
  to authenticated;

commit;
