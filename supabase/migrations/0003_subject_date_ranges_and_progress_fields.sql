-- Small patch from the first teacher review (2026-07-06):
-- 1. Subjects can be active for only part of the school year (e.g. a PE
--    class that only runs September-May), not just a weekday pattern.
-- 2. progress_entries gets the teacher's real 5-field daily note structure
--    instead of a single generic note. No UI reads/writes this table yet,
--    so this is a free schema change.

alter table subject_schedule_patterns
  add column if not exists start_date date,
  add column if not exists end_date date;

alter table subject_schedule_patterns
  add constraint subject_schedule_patterns_date_range_check
  check (start_date is null or end_date is null or end_date >= start_date);

alter table progress_entries
  alter column note drop not null;

alter table progress_entries
  add column if not exists skills_mastered text,
  add column if not exists concepts_to_reinforce text,
  add column if not exists high_interest_topics text,
  add column if not exists learning_style_notes text,
  add column if not exists behavior_attention_notes text;
