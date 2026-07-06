import { useMutation, useQueryClient } from '@tanstack/react-query'
import { computeScheduleDiff } from './scheduleEngine'
import { getSchoolYear } from './schoolYearsApi'
import { getSkipDates } from './skipDatesApi'
import { getSubjectPatterns } from './subjectPatternsApi'
import {
  applyScheduleDiff,
  getScheduleEntriesForSchoolYear,
} from './scheduleEntriesApi'

export function useGenerateSchedule(studentId, schoolYearId) {
  const queryClient = useQueryClient()

  const computeDiffMutation = useMutation({
    mutationFn: async () => {
      const [schoolYear, skipDates, subjectPatterns, existingEntries] = await Promise.all([
        getSchoolYear(studentId),
        getSkipDates(schoolYearId),
        getSubjectPatterns(studentId),
        getScheduleEntriesForSchoolYear(schoolYearId),
      ])

      return computeScheduleDiff({
        schoolYear,
        skipRanges: skipDates,
        subjectPatterns,
        existingEntries,
      })
    },
  })

  const applyDiffMutation = useMutation({
    mutationFn: applyScheduleDiff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleEntries', studentId] })
    },
  })

  return {
    computeDiff: computeDiffMutation.mutateAsync,
    isComputing: computeDiffMutation.isPending,
    applyDiff: applyDiffMutation.mutateAsync,
    isApplying: applyDiffMutation.isPending,
  }
}
