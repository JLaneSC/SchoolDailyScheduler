import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSubjectPatterns, upsertSubjectPattern } from './subjectPatternsApi'

export function useSubjectPatterns(studentId) {
  const queryClient = useQueryClient()
  const queryKey = ['subjectPatterns', studentId]

  const patternsQuery = useQuery({
    queryKey,
    queryFn: () => getSubjectPatterns(studentId),
    enabled: Boolean(studentId),
  })

  const upsertPatternMutation = useMutation({
    mutationFn: upsertSubjectPattern,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    patterns: patternsQuery.data ?? [],
    isLoading: patternsQuery.isLoading,
    error: patternsQuery.error,
    upsertPattern: upsertPatternMutation.mutateAsync,
  }
}
