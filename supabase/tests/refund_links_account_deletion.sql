-- Deleting an account still works with linked reimbursements.
-- See docs/adr/006-reimbursement-purchase-links.md.
--
-- transactions.refunds_transaction_id references transactions(id) with NO ACTION,
-- and a user's rows are removed by the cascade from auth.users: the purchase and
-- its reimbursements go in the same statement, so the foreign key is satisfied
-- when it is checked at the end of it (RESTRICT would fail here). This script
-- builds an account with every kind of link, deletes it exactly as the
-- delete-account Edge Function does (auth.users), and checks nothing is left.
--
-- Run it in the Supabase SQL editor (or psql) as a privileged role, AFTER the
-- refund_links migration. It ends in ROLLBACK, so it leaves no data behind; any
-- failed check raises an exception with what went wrong.
--
-- It needs at least one row in public.categories.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_category uuid;
  v_goal uuid;
  v_income_purchase uuid;
  v_savings_purchase uuid;
  v_linked integer;
  v_refund_transfers integer;
  v_left record;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'refund_links_account_deletion: public.categories is empty';
  end if;

  insert into auth.users (id) values (v_user);
  -- save_transaction reads the caller from auth.uid().
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);

  select public.create_goal('Refund links test', 5000, null, 1000, null) into v_goal;

  -- An income-funded purchase with two partial refunds.
  select public.save_transaction(null, 'Shoes', 100, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":100}]'::jsonb) into v_income_purchase;
  perform public.save_transaction(null, 'Shoes refund 1', 40, 'reimbursement', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":40}]'::jsonb, v_income_purchase);
  perform public.save_transaction(null, 'Shoes refund 2', 60, 'reimbursement', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":60}]'::jsonb, v_income_purchase);

  -- A savings-funded purchase whose refund returns money to the Goal.
  select public.save_transaction(null, 'Laptop', 200, 'expense', v_category, current_date, null, 1, v_goal,
    '[{"payment_method":"Cash","amount":200}]'::jsonb) into v_savings_purchase;
  perform public.save_transaction(null, 'Laptop refund', 50, 'reimbursement', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":50}]'::jsonb, v_savings_purchase);

  -- A standalone reimbursement, as exists today.
  perform public.save_transaction(null, 'Standalone refund', 10, 'reimbursement', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":10}]'::jsonb);

  select count(*) into v_linked from public.transactions where user_id = v_user and refunds_transaction_id is not null;
  select count(*) into v_refund_transfers from public.goal_transfers where user_id = v_user and kind = 'refund';
  if v_linked <> 3 or v_refund_transfers <> 1 then
    raise exception 'refund_links_account_deletion: expected 3 linked refunds and 1 refund transfer, got % and %',
      v_linked, v_refund_transfers;
  end if;

  -- What the delete-account Edge Function does.
  delete from auth.users where id = v_user;
  -- Run the deferred Goal balance check now instead of at a commit that never comes.
  set constraints all immediate;

  select
    (select count(*) from public.transactions where user_id = v_user) as transactions,
    (select count(*) from public.transaction_payments where user_id = v_user) as payments,
    (select count(*) from public.goal_transfers where user_id = v_user) as transfers,
    (select count(*) from public.goals where user_id = v_user) as goals
    into v_left;

  if v_left.transactions + v_left.payments + v_left.transfers + v_left.goals <> 0 then
    raise exception 'refund_links_account_deletion: rows left after deleting the account: %', v_left;
  end if;

  raise notice 'refund_links_account_deletion: OK - account with linked refunds deleted, nothing left';
end;
$$;

rollback;
