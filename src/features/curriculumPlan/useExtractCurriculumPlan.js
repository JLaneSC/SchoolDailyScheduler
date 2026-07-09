import { useMutation } from '@tanstack/react-query'
import { extractCurriculumPlanFromDocument } from './ingestCurriculumPlanApi'
import { findSubjectByName } from './curriculumPlanApi'

// Fully transient (like Milestone 4's useAiSuggestions) — no DB writes here
// at all, not even a subject. Distinct subject names found in the
// extraction are looked up (read-only, case-insensitive) to SUGGEST a
// mapping, which the user reviews/confirms via useSaveCurriculumPlanEntries
// before anything is created or persisted.
export function useExtractCurriculumPlan() {
  const mutation = useMutation({
    mutationFn: async ({ fileBase64, studentId, year, month, sourceFilename }) => {
      const result = await extractCurriculumPlanFromDocument({
        fileBase64,
        studentId,
        year,
        month,
        sourceFilename,
      })

      const entries = result.entries ?? []
      const distinctNames = [...new Set(entries.map((entry) => entry.subject))]

      const subjectSuggestions = new Map()
      for (const name of distinctNames) {
        subjectSuggestions.set(name, await findSubjectByName(name))
      }

      return { ...result, entries, distinctNames, subjectSuggestions }
    },
  })

  return {
    extractCurriculumPlan: mutation.mutateAsync,
    isExtracting: mutation.isPending,
    extractError: mutation.error,
  }
}
