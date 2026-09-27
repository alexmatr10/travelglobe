-- Roll back all TravelGlobe objects that were added to the petcare-staging
-- project (eyjnqctyalifduxyibsv). This returns the project to its original
-- state: no travelers/check_ins tables, no trigger, no function.

begin;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_traveler();

do $$
begin
  -- remove check_ins from the realtime publication if it was added
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'check_ins'
  ) then
    alter publication supabase_realtime drop table public.check_ins;
  end if;
  -- if the publication is now empty, drop it (it was likely created by us)
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime'
  ) then
    drop publication supabase_realtime;
  end if;
end
$$;

drop table if exists public.check_ins;
drop table if exists public.travelers;

commit;
