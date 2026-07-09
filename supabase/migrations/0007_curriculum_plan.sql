-- Milestone 7: month-by-month curriculum scope-and-sequence + mastery data,
-- extracted (with human review) from the family's curriculum planning
-- document. First curriculum-adjacent table scoped per-student (subjects/
-- standards/grade_bands are account-wide) — RLS stays user_id-only,
-- matching every other table; student scoping is app-level via the FK.

create table if not exists curriculum_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete restrict,
  standard_id uuid references standards(id) on delete set null,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  focus_text text not null,
  standards_text text,
  mastery_status text not null default 'not_assessed'
    check (mastery_status in ('mastered','developing','not_assessed','planned')),
  mastery_percentage int check (mastery_percentage between 0 and 100),
  status text not null default 'pending_review'
    check (status in ('pending_review','approved')),
  source_document text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists curriculum_plan_entries_student_year_month_idx
  on curriculum_plan_entries (student_id, year, month, status);

alter table curriculum_plan_entries enable row level security;

create policy "own rows" on curriculum_plan_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
