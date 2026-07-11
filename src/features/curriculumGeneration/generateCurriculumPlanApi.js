import { supabase } from '../../lib/supabaseClient'

export async function generateCurriculumPlanForSubject({
  studentId,
  schoolYearId,
  subjectId,
  gradeBandIds,
  usePriorYearReuse,
  excludedMasteredStandardIds,
  otherSubjectNames,
}) {
  const { data, error } = await supabase.functions.invoke('generate-curriculum-plan-subject', {
    body: {
      studentId,
      schoolYearId,
      subjectId,
      gradeBandIds,
      usePriorYearReuse,
      excludedMasteredStandardIds,
      otherSubjectNames,
    },
  })

  if (error) throw error
  return data
}
