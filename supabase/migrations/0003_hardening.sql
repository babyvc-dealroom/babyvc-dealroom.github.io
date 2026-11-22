-- Fixes from the Supabase security advisor.
-- The trigger function is never meant to be called through the API.
revoke execute on function bvc_offer_counter() from public, anon, authenticated;
-- Fixed search_path on the remaining helpers.
alter function bvc_code(int, text) set search_path = public;
alter function bvc_valid_terms(int, jsonb) set search_path = public;
alter function bvc_not_anon() set search_path = public;
alter function bvc_touch() set search_path = public;
