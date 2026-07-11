import { useQuery } from '@tanstack/react-query'
import { getSchoolYears } from './schoolYearsApi'

// Plural counterpart to useSchoolYear.js — used where prior-year detection
// matters (curriculum generation's "reuse last year's mastered standards"
// toggle), not just "the current" school year.
export function useSchoolYears(studentId) {
  const query = useQuery({
    queryKey: ['schoolYears', studentId],
    queryFn: () => getSchoolYears(studentId),
    enabled: Boolean(studentId),
  })

  return {
    schoolYears: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
