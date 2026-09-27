-- TravelGlobe schema applied to remote project eyjnqctyalifduxyibsv.
-- NOTE: this project already owns a public.profiles table (petcare),
-- so TravelGlobe uses public.travelers instead.

begin;

create table if not exists public.travelers (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.check_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.travelers(id) on delete cascade not null,
  lat double precision not null,
  lng double precision not null,
  place_name text,
  note text,
  created_at timestamptz default now()
);

create index if not exists check_ins_user_id_idx on public.check_ins(user_id);
create index if not exists check_ins_created_at_idx on public.check_ins(created_at desc);

alter table public.travelers enable row level security;
alter table public.check_ins enable row level security;

drop policy if exists "Travelers are viewable by everyone" on public.travelers;
create policy "Travelers are viewable by everyone"
  on public.travelers for select using (true);

drop policy if exists "Users can update own traveler profile" on public.travelers;
create policy "Users can update own traveler profile"
  on public.travelers for update using (auth.uid() = id);

drop policy if exists "Check-ins are viewable by everyone" on public.check_ins;
create policy "Check-ins are viewable by everyone"
  on public.check_ins for select using (true);

drop policy if exists "Users can insert own check-ins" on public.check_ins;
create policy "Users can insert own check-ins"
  on public.check_ins for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own check-ins" on public.check_ins;
create policy "Users can delete own check-ins"
  on public.check_ins for delete using (auth.uid() = user_id);

create or replace function public.handle_new_traveler()
returns trigger as $$
begin
  insert into public.travelers (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_traveler();

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'check_ins'
  ) then
    alter publication supabase_realtime add table public.check_ins;
  end if;
end
$$;

commit;
