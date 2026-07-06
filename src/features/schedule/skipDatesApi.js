import { supabase } from '../../lib/supabaseClient'

export async function getSkipDates(schoolYearId) {
  const { data, error } = await supabase
    .from('school_year_skip_dates')
    .select('*')
    .eq('school_year_id', schoolYearId)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data
}

export async function addSkipDate({ schoolYearId, startDate, endDate, label }) {
  const { data, error } = await supabase
    .from('school_year_skip_dates')
    .insert({
      school_year_id: schoolYearId,
      start_date: startDate,
      end_date: endDate || startDate,
      label: label || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSkipDate(id) {
  const { error } = await supabase.from('school_year_skip_dates').delete().eq('id', id)
  if (error) throw error
}
