-- Each migration that added parameters to create_recurring_expense /
-- update_recurring_expense used `create or replace function` with MORE
-- parameters than the previous version. CREATE OR REPLACE only substitutes
-- a function with the IDENTICAL signature, so every one of those migrations
-- left the prior signature in place as a separate overload instead of
-- replacing it. With the new parameters all defaulted, a call using the
-- original argument list matched several candidates at once, and Postgres
-- raised "could not choose the best candidate function".
--
-- This mirrors the precedent already followed for save_transaction
-- (ADR-006): drop the superseded signature in the same migration that
-- introduces the new one. Here it is applied retroactively so a fresh
-- environment replaying all migrations ends up with exactly one signature
-- per function, matching what was already cleaned up by hand in production.
--
-- `drop function if exists` is idempotent: safe to run again, and safe on
-- an environment where some of these were never created.

begin;

-- create_recurring_expense: legacy signatures, oldest first.
drop function if exists public.create_recurring_expense(text, numeric, uuid, text, integer, date);
drop function if exists public.create_recurring_expense(text, numeric, uuid, text, integer, date, boolean, numeric);
drop function if exists public.create_recurring_expense(text, numeric, uuid, text, integer, date, boolean, numeric, boolean);
drop function if exists public.create_recurring_expense(text, numeric, uuid, text, integer, date, boolean, numeric, boolean, uuid);
-- Kept (current, 12 args): (text, numeric, uuid, text, integer, date, boolean, numeric, boolean, uuid, date, integer)

-- update_recurring_expense: legacy signatures, oldest first.
drop function if exists public.update_recurring_expense(uuid, date, text, numeric, uuid, text, date);
drop function if exists public.update_recurring_expense(uuid, date, text, numeric, uuid, text, date, boolean, numeric);
drop function if exists public.update_recurring_expense(uuid, date, text, numeric, uuid, text, date, boolean, numeric, boolean);
-- Kept (current, 11 args): (uuid, date, text, numeric, uuid, text, date, boolean, numeric, boolean, uuid)

commit;
