-- ADR-014, schema: the shared split (Case A) for recurring expenses. The split
-- is a term property, versioned by effective_from like amount and category
-- already are - not a new table, since no participant identity needs to be
-- stored ahead of time (resolved at posting time against that day's
-- household, ADR-014 decision 1). No behaviour change: every existing row
-- keeps is_shared = false.

begin;

alter table public.recurring_expense_terms
  add column is_shared boolean not null default false,
  add column owner_share_amount numeric,
  add constraint recurring_expense_terms_share_presence
    check (is_shared = (owner_share_amount is not null)),
  add constraint recurring_expense_terms_share_amount_range
    check (
      owner_share_amount is null
      or (owner_share_amount > 0
          and owner_share_amount < amount
          and owner_share_amount = round(owner_share_amount, 2)
          and owner_share_amount < 10000000000)
    );

-- Set by the posting job (see the RPC migration) when a shared term's charge
-- had to post without an accepted household partner that day (ADR-014,
-- decision 6). Never written or read by any client RPC - display only.
alter table public.recurring_occurrences
  add column posted_without_household boolean not null default false;

commit;
