import { supabase } from '../../lib/supabaseClient'

// schedule_entry_standards has no student_id/subject_id/month columns of
// its own — RLS is user_id-only, so student/subject/month scoping happens
// here via an inner join on schedule_entries, matching how
// curriculum_plan_entries and other student-scoped tables are queried
// throughout this app.
export async function getLinks({ studentId, subjectId, year, month, status } = {}) {
  let query = supabase
    .from('schedule_entry_standards')
    .select('*, schedule_entries!inner(scheduled_date, student_id, subject_id), standards(id, code, description)')
    .order('created_at', { ascending: true })

  if (studentId) query = query.eq('schedule_entries.student_id', studentId)
  if (subjectId) query = query.eq('schedule_entries.subject_id', subjectId)
  if (status) query = query.eq('status', status)
  if (year && month) {
    const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonthDate = new Date(Date.UTC(year, month, 1))
    const firstOfNextMonth = nextMonthDate.toISOString().slice(0, 10)
    query = query.gte('schedule_entries.scheduled_date', firstOfMonth)
    query = query.lt('schedule_entries.scheduled_date', firstOfNextMonth)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function insertPendingLinks(rows) {
  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('schedule_entry_standards')
    .insert(
      rows.map((row) => ({
        schedule_entry_id: row.scheduleEntryId,
        standard_id: row.standardId,
        curriculum_plan_entry_id: row.curriculumPlanEntryId ?? null,
        status: 'pending_review',
      }))
    )
    .select()

  if (error) throw error
  return data
}

// Used by Milestone 9's decision-gate apply step: the teacher's explicit
// choice (replacement/blend) IS the confirmation event, so links are
// inserted directly as approved rather than going through another
// pending_review round-trip. Ignores rows that already exist for that
// (scheduleEntryId, standardId) pair (upsert-style) since the target entry
// may already have some of these approved from Milestone 8.
export async function insertApprovedLinks(rows) {
  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('schedule_entry_standards')
    .upsert(
      rows.map((row) => ({
        schedule_entry_id: row.scheduleEntryId,
        standard_id: row.standardId,
        status: 'approved',
      })),
      { onConflict: 'schedule_entry_id,standard_id', ignoreDuplicates: false }
    )
    .select()

  if (error) throw error
  return data
}

// Removes specific standard links from one schedule entry — used when a
// revision drops a standard that IS safely covered elsewhere (the coverage
// check found no risk, so no decision gate was needed).
export async function deleteLinks(scheduleEntryId, standardIds) {
  if (standardIds.length === 0) return

  const { error } = await supabase
    .from('schedule_entry_standards')
    .delete()
    .eq('schedule_entry_id', scheduleEntryId)
    .in('standard_id', standardIds)

  if (error) throw error
}

export async function approveLinks(ids) {
  const { error } = await supabase
    .from('schedule_entry_standards')
    .update({ status: 'approved' })
    .in('id', ids)

  if (error) throw error
}

export async function rejectLinks(ids) {
  const { error } = await supabase.from('schedule_entry_standards').delete().in('id', ids)
  if (error) throw error
}
