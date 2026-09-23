-- Financed purchases (monthly installments) and savings-funded expenses.
-- See docs/adr/003-installments-and-savings-funding.md.
--
-- A purchase stays one row: `amount` is its total and `date` its first
-- installment. Existing rows get the defaults (1 month, funded by income), so
-- last_installment_date = date and every figure stays the same.

begin;

alter table public.transactions
  add column installment_months smallint not null default 1
    constraint transactions_installment_months_range check (installment_months between 1 and 48),
  add column funding_source text not null default 'income'
    constraint transactions_funding_source_values check (funding_source in ('income', 'savings')),
  -- Only expenses can be financed or covered by savings.
  add constraint transactions_schedule_expense_only
    check (type = 'expense' or (installment_months = 1 and funding_source = 'income'));

-- Month arithmetic clamps to the month's last day (Jan 31 + 1 month = Feb 28),
-- which getInstallmentDate in domain/installments.ts reproduces.
alter table public.transactions
  add column last_installment_date date
    generated always as ((date + make_interval(months => installment_months - 1))::date) stored;

commit;
