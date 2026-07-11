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

// All school years for a student, most recent first — used by curriculum
// generation to detect and offer reuse of a prior year's mastered
// standards. getSchoolYear() above intentionally stays single-row (every
// other feature only ever cares about "the current" school year).
export async function getSchoolYears(studentId) {
  const { data, error } = await supabase
    .from('school_years')
    .select('*')
    .eq('student_id', studentId)
    .order('start_date', { ascending: false })

  if (error) throw error
  return data
}

// Best-effort lookup used to opportunistically stamp school_year_id onto
// curriculum_plan_entries rows as they're created (both the Milestone 7
// upload path and Milestone 10 generation) — never required, never blocks
// a save if no match is found.
export async function findSchoolYearForDate(studentId, year, month) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('school_years')
    .select('id')
    .eq('student_id', studentId)
    .lte('start_date', dateStr)
    .gte('end_date', dateStr)
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
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
