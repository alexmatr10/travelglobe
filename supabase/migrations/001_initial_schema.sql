-- supabase/migrations/001_initial_schema.sql

-- Users are handled by auth.users; extend with public profile.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Location check-ins (pings).
create table if not exists public.check_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lat double precision not null,
  lng double precision not null,
  place_name text,
  note text,
  created_at timestamptz default now()
);

-- Indexes for common reads.
create index if not exists check_ins_user_id_idx on public.check_ins(user_id);
create index if not exists check_ins_created_at_idx on public.check_ins(created_at desc);

-- Row Level Security (RLS).
alter table public.profiles enable row level security;
alter table public.check_ins enable row level security;

-- Profiles: readable by everyone, writable by owner.
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Check-ins: readable by everyone, writable by owner.
create policy "Check-ins are viewable by everyone"
  on public.check_ins for select using (true);

create policy "Users can insert own check-ins"
  on public.check_ins for insert with check (auth.uid() = user_id);

create policy "Users can delete own check-ins"
  on public.check_ins for delete using (auth.uid() = user_id);

-- Trigger: create profile after user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
