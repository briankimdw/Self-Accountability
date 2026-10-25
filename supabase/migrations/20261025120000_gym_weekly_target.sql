alter table public.settings
  add column gym_weekly_target int not null default 3 check (gym_weekly_target between 1 and 14);
