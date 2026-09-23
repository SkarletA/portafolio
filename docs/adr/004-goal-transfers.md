# 004. Goal transfers: deposits and savings-funded withdrawals

## Status

Accepted

Amends [ADR-003](./003-installments-and-savings-funding.md): supersedes its
consequence that "Covered by savings" is a declaration not linked to Goals, and
amends the Dashboard balance formula. Every other ADR-003 decision - one row per
purchase, installments derived at query time, the cents allocation,
`funding_source` per transaction, and excluding savings-funded spending from
`spent`, `totalSpent`, the trend buckets and the savings rate everywhere - is
unchanged. ADR-001/002 are unaffected.

## Context

Money moves between the month's spendable money and savings Goals in two ways
that Finora models badly today:

1. **Adding funds to a Goal** (`goalsService.addFundsToGoal`) reads
   `current_amount`, adds the amount in JavaScript and writes it back: two
   unlocked client calls that can lose a concurrent update, store
   floating-point noise, and leave no history. The deposit is invisible to the
   Dashboard and Analytics, so the month's balance overstates what is still
   spendable.
2. **"Covered by savings"** (ADR-003) excludes an expense from the month's
   spend but takes nothing from any Goal: savings are "spent" without any
   balance going down, and nothing prevents covering more than was saved.

Every savings-funded amount must come from one specific Goal - choosing it is
mandatory, and there is no ownerless "general savings" - and a Goal can never
go negative. Transaction writes are also not atomic today
(`createTransaction` / `updateTransaction` write the transaction and its
payments in separate client calls), which becomes unacceptable once a third
row - the Goal withdrawal - must stay consistent with them.

## Decision

- **One ledger: `goal_transfers`** (`id`, `user_id`, `goal_id`, `kind`,
  `amount`, `date`, optional `transaction_id`, `created_at`).
  - `kind` is `opening_balance`, `deposit` or `withdrawal`. Amounts are always
    positive with at most 2 decimals; direction comes from `kind`, like
    `transactions.type`.
  - `amount` is an **unconstrained `numeric`** with checks `amount > 0`,
    `amount = round(amount, 2)` and `amount < 10000000000` (so it always fits
    `goals.current_amount`, which is `numeric(12,2)`). A `numeric(12,2)` column
    would round on insert *before* the CHECK runs, silently turning 10.005 into
    10.01; the unconstrained type makes the database reject it instead.
  - A withdrawal always belongs to exactly one expense and vice versa:
    `(kind = 'withdrawal') = (transaction_id IS NOT NULL)`, `transaction_id`
    unique, `on delete cascade` from `transactions`.
  - `goal_id` references `goals` with `NO ACTION` (not `RESTRICT`), so deleting
    an account still cascades from `auth.users` through both tables.
  - `opening_balance` records money saved before Finora tracked it (the
    existing `current_amount`, or AddGoal's starting amount). It never counts as
    any month's saving; a `deposit` does.
  - RLS: users select their own rows, and may insert or delete only their own
    `deposit` rows on their own goals. No client `update`. Withdrawals and
    opening balances are written only by the RPCs below.

- **`goals.current_amount` stays a stored column, maintained only by a trigger
  on `goal_transfers`**, and a Goal can never end a transaction negative. The
  ledger is the history; the column is a cache the trigger keeps in step inside
  the same statement, and the trigger's row update serializes concurrent writes
  to the same Goal. Clients lose insert/update privileges on `goals`.
  - "Never negative" is enforced by a **deferred constraint trigger**
    (`DEFERRABLE INITIALLY DEFERRED`) on `goals` that, at commit, raises
    `goal_balance_negative` if the Goal still exists with
    `current_amount < 0`. It holds for every write path, including cascaded
    deletes.
  - Not a plain `CHECK (current_amount >= 0)`: Postgres checks a `CHECK` on
    every row update and it cannot be deferred. Deleting an account cascades
    from `auth.users` to `goal_transfers` and `goals` in an order Finora does not
    control; if a Goal's opening balance were deleted before the withdrawal it
    funded, the Goal would pass through a negative intermediate balance and the
    `CHECK` would abort the whole account deletion. Deferred to commit, the
    Goals are already gone and there is nothing to check.

- **`transactions.funding_source` stays.** It remains the flag every spend
  query filters on (ADR-003). Which Goal paid is recorded only on the
  withdrawal. The invariant "`funding_source = 'savings'` if and only if exactly
  one withdrawal exists with the transaction's amount and date" has a single
  writer, `save_transaction`.

- **Write paths.**
  - *Deposit*: a single insert into `goal_transfers`, dated today (the
    client's local date). Already atomic: the trigger updates the Goal in the
    same statement.
  - *Deleting a deposit*: a single delete; rejected with `goal_balance_negative`
    if that money was already used.
  - *`create_goal` RPC*: the Goal and its optional opening balance together.
  - *`save_transaction` RPC*: the only way to create or update a transaction.
    In one database transaction it locks the transaction and every affected
    Goal (in id order, so concurrent A→B and B→A edits cannot deadlock), writes
    the transaction (`funding_source` derived from whether a Goal was given),
    replaces its payments, credits back any previous withdrawal, checks the
    target Goal's balance and inserts the new withdrawal - raising
    `insufficient_goal_funds` with the available amount otherwise. Any error
    rolls everything back, payments included. This also makes the existing
    transaction + payments write atomic.
  - *Deleting a transaction* stays a plain delete: payments and the withdrawal
    cascade, and the trigger returns the money to the Goal.
  - User-initiated withdrawals not tied to an expense are out of scope; a
    mistaken deposit is corrected by deleting it.

- **A savings-funded expense withdraws its full amount once, on its purchase
  date, even when financed.** A Goal's balance answers "how much is still free
  to use"; leaving the unpaid installments in it would let the same savings be
  spent twice. Withdrawing per installment would need stored future-dated rows
  (rejected in ADR-003) or a balance that changes without writes, which no
  stored constraint can protect. Monthly figures keep following ADR-003: each
  installment still counts as "covered by savings" in its own month.

- **Deposits in Dashboard and Analytics.** `MonthlyStats` gains
  `totalDepositedToGoals` (sum of `deposit` transfers dated in the period;
  opening balances and withdrawals excluded).
  - Dashboard balance becomes `totalIncome - totalSpent - totalDepositedToGoals`:
    money actually still spendable.
  - The savings rate is **unchanged**: deposits are money kept, not spent, so
    they must not lower it, and no second goal-based percentage is introduced.
  - Deposits are shown as their own figure ("Saved to goals").
  - Withdrawals appear in no figure: they cancel out against savings-funded
    expenses, which ADR-003 already excludes.

- **Reimbursements are unchanged** and still unlinked to purchases; a
  reimbursement never refills a Goal.

- **Amounts with more than 2 decimals are rounded visibly in the form, and
  rejected by the database.** When a money input loses focus, the form rounds it
  to 2 decimals (half up: 10.005 becomes 10.01) so the user sees the value that
  will be saved before saving it. The rounding works on the decimal text, not
  with floating-point multiplication (in JavaScript `1.005 * 100` is
  `100.49999999999999`, so `Math.round` would give 1.00 instead of 1.01). The RPCs and `goal_transfers`' checks still reject any amount
  that arrives with more than 2 decimals: rounding is a visible form
  convenience, never something the database does silently.

- **Rules per event:**

  | Event | Goal balance | Budgets `spent` / `totalSpent` / trend | Savings rate | Dashboard balance | Saved to goals |
  |---|---|---|---|---|---|
  | Opening balance X | +X | - | - | - | - |
  | Deposit D | +D | - | unchanged | −D in its month | +D in its month |
  | Delete deposit D | −D; rejected if it would go below 0 | - | - | +D | −D |
  | Expense funded by income | - | ADR-003 | ADR-003 | ADR-003 | - |
  | Expense A covered by savings (single or financed), Goal G | −A in full on the purchase date; rejected if G has less than A | 0 | excluded | no net effect | - |
  | Edit that expense | old withdrawal credited back, then new one checked and debited; rejected if insufficient | ADR-003 | ADR-003 | - | - |
  | Delete that expense | +A | - | - | - | - |
  | Reimbursement X | unchanged | ADR-002/003 | nets X (ADR-002) | unchanged | - |

## Implementation

- Migration `supabase/migrations/<timestamp>_goal_transfers.sql`, on top of
  ADR-003's already-applied migration (which is not edited):
  - a pre-flight check that aborts, listing rows, if any Goal has a negative
    `current_amount` or one with more than 2 decimals, or if any transaction
    already has `funding_source = 'savings'` (it has no Goal to point to).
    Offending data is fixed beforehand with explicit statements the user
    approves; nothing is silently rounded or guessed;
  - `goal_transfers` with its constraints, indexes `(user_id, date)` and
    `(goal_id)`, and RLS policies;
  - opening-balance backfill (one `opening_balance` per Goal with
    `current_amount > 0`, dated `coalesce(created_at, now())::date`, since
    `goals.created_at` is nullable), **then** the balance trigger, **then** the
    deferred non-negative constraint trigger, so balances are not doubled;
  - privilege changes: revoke insert/update on `goals` and `transactions`, and
    insert/update/delete on `transaction_payments`, from `anon` and
    `authenticated` (`transaction_payments` already cascades on transaction
    delete);
  - `create_goal` and `save_transaction` as `security definer` functions with
    `search_path = ''`, explicit `auth.uid()` ownership checks on the goal and on
    an existing transaction, executable only by `authenticated`, raising stable
    message codes: `not_authenticated`, `invalid_amount`,
    `invalid_payment_plan`, `payments_do_not_match_amount`,
    `transaction_not_found`, `goal_not_found`, `insufficient_goal_funds`. The
    deferred constraint trigger raises `goal_balance_negative`. There is no
    category ownership check: `categories` has no owner column and its RLS
    lets every authenticated user read all of them, so the existing foreign key
    (the category exists) is the whole rule today;
  - a commented reconciliation query comparing `current_amount` with the
    ledger sum.
- `domain/goal.ts`: `GoalTransfer`, `GoalTransferKind`,
  `getAvailableForExpense(goal, existingWithdrawal)`.
  `domain/installments.ts`: `getPaymentPlanErrors` requires a Goal when funded
  by savings (`missingSavingsGoal`). `domain/transaction.ts`:
  `Transaction.withdrawal`.
- `services/transactionsService.ts`: `saveTransaction` (RPC) replaces
  `createTransaction` / `updateTransaction`; `NewTransactionInput` replaces
  `funding_source` with `savings_goal_id`; the select embeds the withdrawal and
  its Goal's name. `services/goalsService.ts`: `create_goal` RPC,
  `addGoalDeposit`, `getGoalTransfers`, `deleteGoalDeposit`.
  `services/analyticsService.ts`: `totalDepositedToGoals`. A pure domain
  function rounds a money input's decimal text to 2 decimals (half up) for the
  forms' on-blur rounding. A small helper maps
  RPC and constraint errors to i18n keys for its two callers (AddTransaction and
  GoalCard).
- UI, all copy in `en` and `es`:
  - AddTransaction: a required Goal `Select` under "Covered by savings" in the
    Payment plan fieldset, showing each Goal's available amount (in edit mode
    including the current withdrawal, which is credited back on save); an
    insufficient-funds error on that field (client pre-check, server
    authoritative); a link to create a Goal when there are none; the financed
    preview states that the full amount is taken on the purchase date.
  - Goals: "Add funds" creates a deposit; GoalCard gets a collapsible Activity
    list (opening balance, deposits, withdrawals linking to their expense) with
    deletion of deposits; AddGoal's starting amount becomes "Already saved",
    rejects negative values and goes through `create_goal`.
  - Dashboard: the new balance with a note "Includes $X moved to goals";
    Analytics: a "Saved to goals" figure; both "has data" checks consider
    deposits. TransactionItem names the Goal next to "Covered by savings".

## Consequences

- **A Goal can never go negative**, whatever the write path or concurrency: the
  deferred constraint trigger is the final guarantee at commit, and the RPC's
  lock-then-check returns the friendly error before it. Deleting an account
  keeps working even when a Goal's history would pass through a negative
  intermediate balance.
- **Goal balances now have history** and are computed in exact numeric
  arithmetic in the database instead of JavaScript floats.
- **The Dashboard balance changes again**: it now also excludes money moved to
  Goals.
- **Financed + savings-funded purchases** lower the Goal by the full amount on
  the purchase date while monthly figures spread it over installments: the Goal
  describes committed money, Budgets and Analytics describe cash flow. A
  future-dated savings-funded expense lowers the Goal immediately.
- **Editing a savings-funded expense can now fail for lack of funds**, and
  deleting a deposit can fail if that money was already used; both are
  reported on the affected field.
- **All transaction writes go through one RPC.** Direct table writes by clients
  are no longer possible, which is intended.
- **Reimbursing a savings-funded purchase does not refill the Goal**; the user
  adds a deposit. Returning such a purchase in full is done by editing or
  deleting it, which restores the Goal automatically.
- **Goals with transfers cannot be deleted** from the app (no Goal can be
  deleted today).
- **Money inputs round visibly to 2 decimals on blur.** The user always sees
  the amount that will be saved; the database never rounds on its own.
- **Categories are global** (no owner column; readable by every authenticated
  and anonymous request). This predates this ADR and is out of its scope; it
  is recorded because it is why `save_transaction` has no category ownership
  check, and it should be addressed separately.
- **Alternatives considered (rejected):**
  - *Balance computed from a view*: a single source of truth, but "never
    negative" would depend on every write path taking the right lock; a stored
    column with one constraint trigger enforces it in one place.
  - *A plain `CHECK (current_amount >= 0)`*: simpler, but it cannot be deferred,
    so a cascaded account deletion that removes an opening balance before the
    withdrawal it funded would fail.
  - *`numeric(12,2)` for `goal_transfers.amount`*: matches `goals`, but the
    column type rounds before the CHECK runs, silently accepting 10.005 as
    10.01.
  - *Letting the database round amounts*: contradicts "never round money
    silently"; rounding happens visibly in the form instead.
  - *Updating `current_amount` explicitly in each RPC, without a trigger*:
    cascaded deletes (deleting an expense) would bypass it and the balance
    would drift.
  - *Withdrawing per installment*: needs stored future-dated rows or a balance
    that changes without writes, and shows savings as free while they are
    already committed to the card.
  - *Dropping `funding_source` and inferring it from the withdrawal*: every
    spend query would have to join `goal_transfers`, and it would drop a column
    already applied in production.
  - *A `goal_id` column on `transactions`*: duplicates the withdrawal row and
    adds a second invariant to keep in sync.
  - *Deposits lowering the savings rate*: saving would look like overspending.
  - *A second, goal-based savings rate*: competes with the existing rate and
    misses money kept without a logged deposit.
