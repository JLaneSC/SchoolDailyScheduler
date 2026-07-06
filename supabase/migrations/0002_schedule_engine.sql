-- Milestone 2: weekly subject patterns, school-year definition + skip dates,
-- and the linkage/uniqueness schedule_entries needs for idempotent generation.

create table if not exists subject_schedule_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  monday boolean not null default false,
  tuesday boolean not null default false,
  wednesday boolean not null default false,
  thursday boolean not null default false,
  friday boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create table if not exists school_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  student_id uuid not null references students(id) on delete cascade,
  label text,
  start_date date not null,
  end_date date not null,
  target_days int not null default 180,
  counts_monday boolean not null default true,
  counts_tuesday boolean not null default true,
  counts_wednesday boolean not null default true,
  counts_thursday boolean not null default true,
  counts_friday boolean not null default true,
  counts_saturday boolean not null default false,
  counts_sunday boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (target_days > 0)
);

create table if not exists school_year_skip_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  school_year_id uuid not null references school_years(id) on delete cascade,
  start_date date not null,
  end_date date not null,        -- single day: start_date = end_date
  label text,                     -- e.g. "Winter Break"
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- Link generated entries back to the school year that produced them, and
-- make (student, subject, date) unique so the engine can upsert idempotently.
alter table schedule_entries
  add column if not exists school_year_id uuid references school_years(id) on delete cascade;

alter table schedule_entries
  add constraint schedule_entries_student_subject_date_unique
  unique (student_id, subject_id, scheduled_date);

create index if not exists schedule_entries_student_date_idx
  on schedule_entries (student_id, scheduled_date);
create index if not exists subject_schedule_patterns_student_idx
  on subject_schedule_patterns (student_id);
create index if not exists school_year_skip_dates_school_year_idx
  on school_year_skip_dates (school_year_id);

alter table subject_schedule_patterns enable row level security;
alter table school_years              enable row level security;
alter table school_year_skip_dates    enable row level security;

create policy "own rows" on subject_schedule_patterns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on school_years              for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on school_year_skip_dates    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
