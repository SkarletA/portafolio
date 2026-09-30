-- get_household_partner: the minimal identity (name, avatar) of the other
-- member of the caller's household, for the invitation UI and Settings.
-- See docs/adr/008-household-partner-profile-visibility.md.
--
-- profiles keeps its existing self-only RLS unchanged: phone, date_of_birth
-- and nationality were never part of "mutual visibility" - that was asked
-- for financial data (ADR-007), not personal data. This function is the one
-- deliberate exception, and it exposes exactly first_name/last_name/
-- avatar_url - nothing else from profiles, ever - to someone who shares a
-- household_members row with that person.
--
-- Deliberately NOT gated on status = 'accepted' on the caller's side: a
-- pending invitee needs to see who invited them (the inviter's own row is
-- always 'accepted' by construction - invite_household_member creates it
-- that way), and an accepted inviter needs to see the name of the partner
-- they are still waiting on. A household never holds more than its two
-- founding rows (ADR-007), and decline_household_invite/leave_household
-- always delete both rows together, so there is no state where this join
-- finds a "partner" without a real, current relationship between the two.

begin;

create function public.get_household_partner()
returns table(user_id uuid, first_name text, last_name text, avatar_url text)
language sql stable security definer set search_path = ''
as $$
  select p.user_id, p.first_name, p.last_name, p.avatar_url
    from public.household_members me
    join public.household_members other
      on other.household_id = me.household_id and other.user_id <> me.user_id
    join public.profiles p on p.user_id = other.user_id
   where me.user_id = auth.uid()
$$;

revoke execute on function public.get_household_partner() from public, anon;
grant execute on function public.get_household_partner() to authenticated;

commit;
