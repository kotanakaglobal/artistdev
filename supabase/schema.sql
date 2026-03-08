-- Enable UUID generator
create extension if not exists pgcrypto;

-- User profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Prediction records
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  artist_name text not null,
  artist_link text not null,
  result_status text not null default 'pending' check (result_status in ('pending', 'hit', 'miss')),
  score_awarded integer not null default 0,
  evaluation_rule_version text not null default 'v1',
  evaluated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Point history logs
create table if not exists public.point_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  points integer not null,
  reason_type text not null,
  created_at timestamptz not null default now()
);

-- User votes on predictions
create table if not exists public.prediction_votes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote boolean not null,
  created_at timestamptz not null default now(),
  unique (prediction_id, user_id)
);

create index if not exists predictions_user_id_idx on public.predictions(user_id);
create index if not exists predictions_created_at_idx on public.predictions(created_at desc);
create index if not exists point_logs_user_id_idx on public.point_logs(user_id);
create index if not exists prediction_votes_prediction_id_idx on public.prediction_votes(prediction_id);

-- Automatically create profiles row after sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.point_logs enable row level security;
alter table public.prediction_votes enable row level security;

-- profiles policies
create policy "profiles selectable by authenticated"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- predictions policies
create policy "predictions readable by authenticated"
  on public.predictions for select
  using (auth.role() = 'authenticated');

create policy "users can insert own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "users can update prediction status by votes"
  on public.predictions for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- point_logs policies
create policy "point_logs readable by authenticated"
  on public.point_logs for select
  using (auth.role() = 'authenticated');

-- prediction_votes policies
create policy "prediction_votes readable by authenticated"
  on public.prediction_votes for select
  using (auth.role() = 'authenticated');

create policy "users can insert own votes"
  on public.prediction_votes for insert
  with check (auth.uid() = user_id);

create policy "users can update own votes"
  on public.prediction_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin policies (role check via profiles)
create policy "admins can update predictions"
  on public.predictions for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admins can insert point_logs"
  on public.point_logs for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
