-- Milestone 4: AI-suggested (then possibly teacher-edited) activity plan
-- text for a specific scheduled subject instance. Nullable; populated only
-- when the teacher accepts/saves a plan for that day's entry.

alter table schedule_entries
  add column if not exists activity_plan text;
