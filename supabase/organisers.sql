-- Owner access: email + password, and only for the emails listed in `organisers`.
--
-- 1. Supabase → Authentication → Users → Add user → Create new user:
--    your email + a strong password of your choice, tick "Auto Confirm User".
--    The password lives only in Supabase (hashed): nobody, not even this code, knows it.
-- 2. Run this in the SQL Editor with the same email (one line per organiser):

insert into organisers (email) values ('nome.cognome@babyvc.it') on conflict do nothing;

-- To remove an organiser: delete from organisers where email = 'nome.cognome@babyvc.it';
