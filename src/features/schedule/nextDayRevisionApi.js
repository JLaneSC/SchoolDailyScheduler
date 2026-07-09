import { supabase } from '../../lib/supabaseClient'

export async function fetchNextDayRevision(studentId, sourceDate) {
  const { data, error } = await supabase.functions.invoke('suggest-next-day-revision', {
    body: { studentId, sourceDate },
  })

  if (error) throw error
  return data
}
