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
