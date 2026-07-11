-- Milestone 10: standards-driven curriculum generation. school_year_id
-- lets curriculum_plan_entries be unambiguously scoped to a specific
-- school year (needed to find "the prior year's" approved rows for reuse
-- -- year/month ints alone are ambiguous if school years for the same
-- student ever overlap calendar months). curriculum_generation_runs lets
-- one "generate the whole year" action be reviewed/approved as a single
-- unit rather than an undifferentiated pile of 80+ pending rows.
--
-- Existing rows (M7 docx uploads to date) get NULL for both new columns --
-- no backfill attempted; population is opportunistic going forward for
-- BOTH the upload and generation paths.
alter table curriculum_plan_entries
  add column if not exists school_year_id uuid references school_years(id) on delete set null;

create table if not exists curriculum_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  student_id uuid not null references students(id) on delete cascade,
  school_year_id uuid not null references school_years(id) on delete cascade,
  used_prior_year_reuse boolean not null default false,
  assessment_source_document text,
  grade_band_summary text,
  created_at timestamptz not null default now()
);

-- on delete set null / purely informational -- never load-bearing for RLS
-- or app logic, matching schedule_entry_standards.curriculum_plan_entry_id's
-- existing traceability-only precedent (Milestone 8).
alter table curriculum_plan_entries
  add column if not exists generation_run_id uuid
    references curriculum_generation_runs(id) on delete set null;

create index if not exists curriculum_plan_entries_generation_run_idx
  on curriculum_plan_entries (generation_run_id);
create index if not exists curriculum_plan_entries_school_year_idx
  on curriculum_plan_entries (student_id, school_year_id, status);

alter table curriculum_generation_runs enable row level security;

create policy "own rows" on curriculum_generation_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
