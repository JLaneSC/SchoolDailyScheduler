import { supabase } from '../../lib/supabaseClient'

export async function getSubjectPatterns(studentId) {
  const { data, error } = await supabase
    .from('subject_schedule_patterns')
    .select('*')
    .eq('student_id', studentId)

  if (error) throw error
  return data
}

export async function upsertSubjectPattern({
  studentId,
  subjectId,
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  startDate,
  endDate,
}) {
  const { data, error } = await supabase
    .from('subject_schedule_patterns')
    .upsert(
      {
        student_id: studentId,
        subject_id: subjectId,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        start_date: startDate || null,
        end_date: endDate || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,subject_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}
