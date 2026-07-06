-- Milestone 3: one progress note per schedule_entry (edit-in-place), and a
-- standalone Master Supply List.

alter table progress_entries
  alter column schedule_entry_id set not null;

alter table progress_entries
  drop constraint if exists progress_entries_schedule_entry_id_fkey;

alter table progress_entries
  add constraint progress_entries_schedule_entry_id_fkey
  foreign key (schedule_entry_id) references schedule_entries(id) on delete cascade;

alter table progress_entries
  add constraint progress_entries_schedule_entry_id_unique unique (schedule_entry_id);

create index if not exists progress_entries_student_idx on progress_entries (student_id);

create table if not exists supply_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  quantity int,
  notes text,
  created_at timestamptz not null default now()
);

alter table supply_items enable row level security;

create policy "own rows" on supply_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
