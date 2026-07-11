import { useQuery } from '@tanstack/react-query'
import { getGenerationRuns } from './curriculumGenerationApi'

// Read-only list of past generation runs for a student — used by
// CurriculumPlanPage to offer a "filter to this run" picker so an 80-row
// generated batch is reviewable as one unit rather than mixed in with
// everything else.
export function useGenerationRuns(studentId) {
  const query = useQuery({
    queryKey: ['curriculumGenerationRuns', studentId],
    queryFn: () => getGenerationRuns(studentId),
    enabled: Boolean(studentId),
  })

  return {
    generationRuns: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
