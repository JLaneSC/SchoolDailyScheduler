import { supabase } from '../../lib/supabaseClient'

export async function proposeStandardDistribution({ studentId, subjectId, year, month }) {
  const { data, error } = await supabase.functions.invoke('propose-standard-distribution', {
    body: { studentId, subjectId, year, month },
  })

  if (error) throw error
  return data
}
