import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insertPendingEntries, matchApprovedStandardByCode } from './curriculumPlanApi'
import { addSubject } from '../subjects/subjectsApi'
import { findSchoolYearForDate } from '../schedule/schoolYearsApi'

// Runs only after the user has explicitly confirmed a subject mapping
// (existing subject or a named new one) for every distinct subject name
// found during extraction. This is the point where subjects actually get
// created and curriculum_plan_entries rows are persisted as pending_review.
export function useSaveCurriculumPlanEntries() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ entries, subjectMapping, studentId, year, month, sourceFilename }) => {
      const resolvedSubjectId = new Map()
      for (const [name, choice] of subjectMapping) {
        if (choice.type === 'existing') {
          resolvedSubjectId.set(name, choice.subjectId)
        } else {
          const created = await addSubject({ name: choice.name, description: '' })
          resolvedSubjectId.set(name, created.id)
        }
      }

      // Best-effort, opportunistic — never blocks a save if no school year
      // matches this upload's year/month (e.g. no school year set up yet).
      const schoolYearId = await findSchoolYearForDate(studentId, year, month)

      const rows = []
      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index]
        const standardId = await matchApprovedStandardByCode(entry.standardsText)
        rows.push({
          studentId,
          subjectId: resolvedSubjectId.get(entry.subject),
          standardId,
          schoolYearId,
          year,
          month,
          focusText: entry.focusText,
          standardsText: entry.standardsText,
          masteryStatus: entry.masteryStatus,
          masteryPercentage: entry.masteryPercentage,
          sortOrder: index,
          sourceDocument: sourceFilename,
        })
      }

      const inserted = await insertPendingEntries(rows)
      return { insertedCount: inserted.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculumPlanEntries'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  return {
    saveCurriculumPlanEntries: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  }
}
