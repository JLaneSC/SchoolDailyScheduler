import { supabase } from '../../lib/supabaseClient'

export async function getSchoolYear(studentId) {
  const { data, error } = await supabase
    .from('school_years')
    .select('*')
    .eq('student_id', studentId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveSchoolYear({
  id,
  studentId,
  label,
  startDate,
  endDate,
  targetDays,
  countsMonday,
  countsTuesday,
  countsWednesday,
  countsThursday,
  countsFriday,
  countsSaturday,
  countsSunday,
}) {
  const payload = {
    student_id: studentId,
    label: label || null,
    start_date: startDate,
    end_date: endDate,
    target_days: targetDays,
    counts_monday: countsMonday,
    counts_tuesday: countsTuesday,
    counts_wednesday: countsWednesday,
    counts_thursday: countsThursday,
    counts_friday: countsFriday,
    counts_saturday: countsSaturday,
    counts_sunday: countsSunday,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { data, error } = await supabase
      .from('school_years')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('school_years')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}
