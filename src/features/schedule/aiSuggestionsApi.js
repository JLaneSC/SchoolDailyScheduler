import { supabase } from '../../lib/supabaseClient'

export async function fetchDailyActivitySuggestions(studentId, targetDate) {
  const { data, error } = await supabase.functions.invoke('suggest-daily-activities', {
    body: { studentId, targetDate },
  })

  if (error) throw error
  return data
}
