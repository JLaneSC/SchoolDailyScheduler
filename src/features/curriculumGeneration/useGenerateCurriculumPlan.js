import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { generateCurriculumPlanForSubject } from './generateCurriculumPlanApi'

// Fully transient (like every other AI-proposal hook in this app) — no DB
// writes here. Orchestrates one generate-curriculum-plan-subject call per
// selected subject, sequentially (clear per-subject progress, each call
// independently retriable, no partial-batch failure) rather than fanning
// out internally in one Edge Function invocation. The teacher reviews the
// aggregated result before useSaveGeneratedCurriculumPlan writes anything.
export function useGenerateCurriculumPlan() {
  const [progress, setProgress] = useState({ completed: 0, total: 0, currentSubjectName: null })

  const mutation = useMutation({
    mutationFn: async ({
      studentId,
      schoolYearId,
      selections,
      usePriorYearReuse,
      excludedMasteredStandardIds,
    }) => {
      setProgress({ completed: 0, total: selections.length, currentSubjectName: null })
      const allSubjectNames = selections.map((s) => s.subjectName)
      const results = []

      for (let i = 0; i < selections.length; i++) {
        const selection = selections[i]
        setProgress({ completed: i, total: selections.length, currentSubjectName: selection.subjectName })

        const result = await generateCurriculumPlanForSubject({
          studentId,
          schoolYearId,
          subjectId: selection.subjectId,
          gradeBandIds: selection.gradeBandIds,
          usePriorYearReuse,
          excludedMasteredStandardIds,
          otherSubjectNames: allSubjectNames.filter((name) => name !== selection.subjectName),
        })

        results.push({
          subjectId: selection.subjectId,
          subjectName: selection.subjectName,
          gradeBandIds: selection.gradeBandIds,
          entries: result.entries ?? [],
          unusedStandardIds: result.unusedStandardIds ?? [],
          excludedMasteredCount: result.excludedMasteredCount ?? 0,
          message: result.message ?? null,
        })
      }

      setProgress({ completed: selections.length, total: selections.length, currentSubjectName: null })
      return results
    },
  })

  return {
    generatePlan: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    generateError: mutation.error,
    progress,
  }
}
