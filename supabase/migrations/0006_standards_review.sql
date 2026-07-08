-- Milestone 6: review/approval workflow for AI-ingested standards. Rows land
-- as 'pending_review' immediately after extraction (client-inserted, never
-- by the Edge Function) and only flip to 'approved' via explicit user action.
-- Rejected rows are hard-deleted — they were never validated, so there's no
-- audit value in keeping them. EVERY future read of "trusted" standards
-- (this milestone's read view, and any later AI feature that cites a code)
-- MUST filter status = 'approved'.

alter table standards
  add column if not exists status text not null default 'pending_review'
    check (status in ('pending_review', 'approved')),
  add column if not exists source_document text,
  add column if not exists ingested_at timestamptz not null default now();

create index if not exists standards_status_subject_idx
  on standards (user_id, subject_id, status);
