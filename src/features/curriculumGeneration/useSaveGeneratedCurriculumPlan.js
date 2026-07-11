import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insertGenerationRun, insertGeneratedEntries } from './curriculumGenerationApi'

// Runs only after the teacher has reviewed the aggregated multi-subject
// batch. Creates one curriculum_generation_runs row (so this batch reviews
// as a single unit, not 80+ undifferentiated pending rows) then inserts
// every subject's entries as pending_review, same as every other AI
// proposal in this app — approved via a separate explicit action.
export function useSaveGeneratedCurriculumPlan() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ studentId, schoolYearId, usePriorYearReuse, gradeBandSummary, results }) => {
      const run = await insertGenerationRun({
        studentId,
        schoolYearId,
        usedPriorYearReuse: usePriorYearReuse,
        gradeBandSummary,
      })

      const rows = []
      for (const subjectResult of results) {
        for (let index = 0; index < subjectResult.entries.length; index++) {
          const entry = subjectResult.entries[index]
          rows.push({
            studentId,
            subjectId: subjectResult.subjectId,
            standardId: entry.standardIds.length === 1 ? entry.standardIds[0] : null,
            schoolYearId,
            generationRunId: run.id,
            year: entry.year,
            month: entry.month,
            focusText: entry.focusText,
            standardsText: entry.standardsText,
            sortOrder: index,
            sourceDocument: `generated: school year ${schoolYearId}`,
          })
        }
      }

      const inserted = await insertGeneratedEntries(rows)
      return { insertedCount: inserted.length, generationRunId: run.id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculumPlanEntries'] })
      queryClient.invalidateQueries({ queryKey: ['curriculumGenerationRuns'] })
    },
  })

  return {
    saveGeneratedPlan: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  }
}
