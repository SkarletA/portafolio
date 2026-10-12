-- Guards against the create_recurring_expense / update_recurring_expense
-- overload bug (fixed in 20261012090000_drop_legacy_recurring_expense_overloads.sql):
-- a migration that adds parameters to an existing function via
-- `create or replace function` with a longer argument list leaves the prior
-- signature behind as a second overload instead of replacing it, so a call
-- using the original argument list becomes ambiguous ("could not choose the
-- best candidate function").
--
-- This fails if any function in public or private has more than one live
-- signature, unless explicitly allowed below. Run it in the Supabase SQL
-- editor (or psql) as a privileged role. It makes no changes.
--
-- Known legitimate exceptions go here, as 'schema.function_name' - add an
-- entry only with a comment explaining why that function is meant to have
-- more than one signature.
-- (none currently)

begin;

do $$
declare
  v_allowed text[] := array[]::text[];
  v_offenders text;
begin
  select string_agg(format('%s.%s (%s signatures)', nspname, proname, cnt), ', ')
    into v_offenders
  from (
    select n.nspname, p.proname, count(*) as cnt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
    group by n.nspname, p.proname
    having count(*) > 1
      and not (n.nspname || '.' || p.proname = any(v_allowed))
  ) dup;

  if v_offenders is not null then
    raise exception 'function_signature_uniqueness: more than one signature found for: %', v_offenders;
  end if;

  raise notice 'function_signature_uniqueness: all checks passed';
end;
$$;

rollback;
