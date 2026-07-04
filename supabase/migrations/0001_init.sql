-- Milestone 1 foundation schema: students, subjects, standards framework,
-- and slim placeholders for schedule/progress (populated in later milestones).

create extension if not exists "pgcrypto";

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  grade_level text not null,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists grade_bands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  label text not null,           -- e.g. "K-2", "3-5", "6-8"
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists standards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  grade_band_id uuid references grade_bands(id) on delete set null,
  code text,                     -- optional external standard code
  description text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  scheduled_date date not null,
  day_number int,                -- 1..180 school-day counter, populated later
  status text not null default 'planned'
    check (status in ('planned','completed','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  schedule_entry_id uuid references schedule_entries(id) on delete set null,
  standard_id uuid references standards(id) on delete set null,
  entry_date date not null default current_date,
  note text not null,
  ai_acknowledgment text,         -- populated by future AI milestone
  mastery_level text,             -- populated by future adaptive-scheduling milestone
  created_at timestamptz not null default now()
);

alter table students enable row level security;
alter table subjects enable row level security;
alter table grade_bands enable row level security;
alter table standards enable row level security;
alter table schedule_entries enable row level security;
alter table progress_entries enable row level security;

create policy "own rows" on students         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on subjects         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on grade_bands      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on standards        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on schedule_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on progress_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
