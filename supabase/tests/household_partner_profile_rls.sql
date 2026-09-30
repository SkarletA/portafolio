-- get_household_partner: visible before acceptance (both directions), never
-- to anyone outside the relationship.
-- See docs/adr/008-household-partner-profile-visibility.md.
--
-- Same harness as household_rls.sql: checks run under "set local role
-- authenticated" (not the superuser that owns the function) so RLS/grants
-- actually apply, and auth.uid() is simulated via the request.jwt.claim(s)
-- GUCs. Ends in ROLLBACK; any failed check raises an exception naming what
-- was expected.

begin;

do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_n integer;
  v_name text;
begin
  insert into auth.users (id, email) values
    (v_a, 'household-partner-rls-a@example.com'),
    (v_b, 'household-partner-rls-b@example.com'),
    (v_c, 'household-partner-rls-c@example.com');

  execute 'set local role authenticated';

  -- A trigger on auth.users already creates the profiles row (confirmed by
  -- a plain insert above failing on profiles_pkey), so this upserts the
  -- names onto it instead of assuming the row does not exist yet.
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);
  insert into public.profiles (user_id, first_name, last_name) values (v_a, 'Alex', 'Ramirez')
    on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);
  insert into public.profiles (user_id, first_name, last_name) values (v_b, 'Bel', 'Suarez')
    on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name;

  perform set_config('request.jwt.claim.sub', v_c::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c)::text, true);
  insert into public.profiles (user_id, first_name, last_name) values (v_c, 'Cami', 'Torres')
    on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name;

  -- 1. No household: get_household_partner() returns nothing.
  select count(*) into v_n from public.get_household_partner();
  if v_n <> 0 then raise exception 'household_partner_profile_rls test 1: C sees % partner rows, expected 0', v_n; end if;

  -- 2. A invites B (pending). Both directions already see a name: the
  --    pending invitee sees the inviter, and the accepted inviter sees the
  --    still-pending invitee.
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);
  perform public.invite_household_member('household-partner-rls-b@example.com');

  select first_name into v_name from public.get_household_partner();
  if v_name is distinct from 'Bel' then
    raise exception 'household_partner_profile_rls test 2: A (accepted inviter) sees partner %, expected Bel', v_name;
  end if;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);

  select first_name into v_name from public.get_household_partner();
  if v_name is distinct from 'Alex' then
    raise exception 'household_partner_profile_rls test 2: B (pending invitee) sees partner %, expected Alex', v_name;
  end if;

  raise notice 'household_partner_profile_rls: OK (1/3) - a pending invite already resolves a name on both sides';

  -- 3. B accepts: both still see each other; C, unrelated, still sees no one.
  perform public.accept_household_invite();

  select first_name into v_name from public.get_household_partner();
  if v_name is distinct from 'Alex' then
    raise exception 'household_partner_profile_rls test 3: B (accepted) sees partner %, expected Alex', v_name;
  end if;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  select first_name into v_name from public.get_household_partner();
  if v_name is distinct from 'Bel' then
    raise exception 'household_partner_profile_rls test 3: A (accepted) sees partner %, expected Bel', v_name;
  end if;

  raise notice 'household_partner_profile_rls: OK (2/3) - acceptance does not change either side''s view';

  perform set_config('request.jwt.claim.sub', v_c::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c)::text, true);

  select count(*) into v_n from public.get_household_partner();
  if v_n <> 0 then raise exception 'household_partner_profile_rls test 3: C sees % partner rows, expected 0', v_n; end if;

  raise notice 'household_partner_profile_rls: OK (3/3) - an unrelated user sees no one';

  execute 'reset role';
end;
$$;

rollback;
