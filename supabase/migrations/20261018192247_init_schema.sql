-- Per-user preferences
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  daily_app_target int not null default 5 check (daily_app_target between 1 and 100),
  weight_unit text not null default 'lb' check (weight_unit in ('lb', 'kg')),
  updated_at timestamptz not null default now()
);

-- Dated commitments with a step plan
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  why text not null default '' check (char_length(why) <= 500),
  date_key date not null,
  time text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  minutes int not null default 30 check (minutes between 1 and 1440),
  plan jsonb not null default '[]'::jsonb,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index goals_user_date on public.goals (user_id, date_key);

-- Job applications; url_key is the normalized URL used for duplicate detection
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  company text not null check (char_length(company) between 1 and 200),
  role text not null default '' check (char_length(role) <= 200),
  url text not null default '' check (char_length(url) <= 2000),
  url_key text not null default '' check (char_length(url_key) <= 2000),
  status text not null default 'applied' check (status in ('applied', 'interview', 'offer', 'rejected')),
  applied_on date not null,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create unique index job_applications_unique_url on public.job_applications (user_id, url_key) where url_key <> '';
create index job_applications_user_date on public.job_applications (user_id, applied_on);

-- Gym: a workout has many sets
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  performed_on date not null,
  name text not null default '' check (char_length(name) <= 100),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index workouts_user_date on public.workouts (user_id, performed_on);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  exercise text not null check (char_length(exercise) between 1 and 100),
  position int not null default 0,
  weight numeric(7, 2) not null default 0 check (weight >= 0 and weight < 10000),
  reps int not null check (reps between 1 and 1000),
  created_at timestamptz not null default now()
);
create index workout_sets_workout on public.workout_sets (workout_id);
create index workout_sets_user_exercise on public.workout_sets (user_id, lower(exercise));

-- Row level security: each user sees only their own rows
alter table public.settings enable row level security;
alter table public.goals enable row level security;
alter table public.job_applications enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

create policy "own settings" on public.settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own goals" on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own job applications" on public.job_applications for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own workouts" on public.workouts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own workout sets" on public.workout_sets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );
