-- StudyTrack STIKOM Tunas Bangsa
-- Jalankan seluruh file ini di Supabase SQL Editor.
-- Schema ini sengaja membuat data mahasiswa terpisah berdasarkan auth.uid().

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  prodi text not null default 'TI' check (prodi in ('TI','SI')),
  semester integer not null default 1 check (semester between 1 and 8),
  target_ipk numeric(3,2) not null default 4.00 check (target_ipk between 0 and 4),
  cumlaude_threshold numeric(3,2) not null default 3.51 check (cumlaude_threshold between 0 and 4),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text,
  name text not null,
  sks integer not null default 3 check (sks between 0 and 12),
  semester integer not null default 1 check (semester between 1 and 8),
  created_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  day_order integer not null check(day_order between 1 and 7),
  lecturer text,
  room text,
  start_time time,
  end_time time,
  sks integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  deadline timestamptz not null,
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  status text not null default 'todo' check(status in ('todo','done')),
  created_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  semester integer not null check(semester between 1 and 8),
  sks integer not null default 3 check(sks between 0 and 12),
  letter text,
  grade_point numeric(3,2) check(grade_point between 0 and 4),
  created_at timestamptz not null default now()
);

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  minutes integer not null default 30,
  note text,
  unique(user_id, study_date)
);

create table if not exists public.grade_scales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  letter text not null,
  min_score numeric(5,2),
  grade_point numeric(3,2) not null check(grade_point between 0 and 4)
);

create table if not exists public.academic_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  cumlaude_threshold numeric(3,2) not null default 3.51,
  target_ipk numeric(3,2) not null default 4.00,
  updated_at timestamptz not null default now()
);

-- Trigger profile otomatis setelah sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.schedules enable row level security;
alter table public.assignments enable row level security;
alter table public.grades enable row level security;
alter table public.study_logs enable row level security;
alter table public.grade_scales enable row level security;
alter table public.academic_settings enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Generic owner policies
create policy "courses_all_own" on public.courses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "schedules_all_own" on public.schedules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "assignments_all_own" on public.assignments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "grades_all_own" on public.grades for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "study_logs_all_own" on public.study_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "grade_scales_all_own" on public.grade_scales for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "academic_settings_all_own" on public.academic_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Indexes
create index if not exists courses_user_idx on public.courses(user_id);
create index if not exists schedules_user_idx on public.schedules(user_id);
create index if not exists assignments_user_deadline_idx on public.assignments(user_id, deadline);
create index if not exists grades_user_semester_idx on public.grades(user_id, semester);
create index if not exists study_logs_user_date_idx on public.study_logs(user_id, study_date);
