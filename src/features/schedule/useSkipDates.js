import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addSkipDate, deleteSkipDate, getSkipDates } from './skipDatesApi'

export function useSkipDates(schoolYearId) {
  const queryClient = useQueryClient()
  const queryKey = ['skipDates', schoolYearId]

  const skipDatesQuery = useQuery({
    queryKey,
    queryFn: () => getSkipDates(schoolYearId),
    enabled: Boolean(schoolYearId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey })
  }

  const addSkipDateMutation = useMutation({
    mutationFn: addSkipDate,
    onSuccess: invalidate,
  })

  const deleteSkipDateMutation = useMutation({
    mutationFn: deleteSkipDate,
    onSuccess: invalidate,
  })

  return {
    skipDates: skipDatesQuery.data ?? [],
    isLoading: skipDatesQuery.isLoading,
    error: skipDatesQuery.error,
    addSkipDate: addSkipDateMutation.mutateAsync,
    deleteSkipDate: deleteSkipDateMutation.mutateAsync,
  }
}
