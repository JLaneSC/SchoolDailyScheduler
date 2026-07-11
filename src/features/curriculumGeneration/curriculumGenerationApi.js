import { supabase } from '../../lib/supabaseClient'

export async function insertGenerationRun({
  studentId,
  schoolYearId,
  usedPriorYearReuse,
  assessmentSourceDocument,
  gradeBandSummary,
}) {
  const { data, error } = await supabase
    .from('curriculum_generation_runs')
    .insert({
      student_id: studentId,
      school_year_id: schoolYearId,
      used_prior_year_reuse: usedPriorYearReuse,
      assessment_source_document: assessmentSourceDocument ?? null,
      grade_band_summary: gradeBandSummary ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function insertGeneratedEntries(rows) {
  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('curriculum_plan_entries')
    .insert(
      rows.map((row) => ({
        student_id: row.studentId,
        subject_id: row.subjectId,
        standard_id: row.standardId ?? null,
        school_year_id: row.schoolYearId,
        generation_run_id: row.generationRunId,
        year: row.year,
        month: row.month,
        focus_text: row.focusText,
        standards_text: row.standardsText,
        mastery_status: 'planned',
        sort_order: row.sortOrder,
        status: 'pending_review',
        source_document: row.sourceDocument,
      }))
    )
    .select()

  if (error) throw error
  return data
}

export async function getGenerationRuns(studentId) {
  const { data, error } = await supabase
    .from('curriculum_generation_runs')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
