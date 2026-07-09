-- Milestone 8: many-to-many link between a specific scheduled subject
-- instance (schedule_entries row) and the standard(s) it targets. Mirrors
-- the pending_review -> approved workflow from Milestone 6 (standards) and
-- Milestone 7 (curriculum_plan_entries): AI proposes a distribution
-- (transient, in the Edge Function), the teacher reviews/edits it, and
-- only rows the teacher has explicitly approved are ever trusted by the
-- Milestone 9 coverage check or any other future read.
-- EVERY future read of "trusted" links MUST filter status = 'approved'.
--
-- curriculum_plan_entry_id is nullable traceability only (which month's
-- focus/standards row produced this proposal) -- never used for RLS or
-- application logic, purely informational.
--
-- Both FKs are on delete cascade: a link row has no meaning once either
-- side is gone, and standard_id here is not null (a pure join row) so
-- set null isn't an option the way it is on curriculum_plan_entries.
create table if not exists schedule_entry_standards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  schedule_entry_id uuid not null references schedule_entries(id) on delete cascade,
  standard_id uuid not null references standards(id) on delete cascade,
  curriculum_plan_entry_id uuid references curriculum_plan_entries(id) on delete set null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved')),
  created_at timestamptz not null default now(),
  unique (schedule_entry_id, standard_id)
);

create index if not exists schedule_entry_standards_entry_status_idx
  on schedule_entry_standards (schedule_entry_id, status);
create index if not exists schedule_entry_standards_standard_idx
  on schedule_entry_standards (standard_id, status);

alter table schedule_entry_standards enable row level security;

create policy "own rows" on schedule_entry_standards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
