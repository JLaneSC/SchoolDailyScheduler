import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveStandards,
  getStandards,
  rejectStandards,
  updateStandard,
} from './standardsApi'

export function useStandards({ status, subjectId } = {}) {
  const queryClient = useQueryClient()
  const queryKey = ['standards', { status, subjectId }]

  const standardsQuery = useQuery({
    queryKey,
    queryFn: () => getStandards({ status, subjectId }),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['standards'] })
  }

  const updateStandardMutation = useMutation({
    mutationFn: ({ id, ...updates }) => updateStandard(id, updates),
    onSuccess: invalidate,
  })

  const approveStandardsMutation = useMutation({
    mutationFn: approveStandards,
    onSuccess: invalidate,
  })

  const rejectStandardsMutation = useMutation({
    mutationFn: rejectStandards,
    onSuccess: invalidate,
  })

  return {
    standards: standardsQuery.data ?? [],
    isLoading: standardsQuery.isLoading,
    error: standardsQuery.error,
    updateStandard: updateStandardMutation.mutateAsync,
    approveStandards: approveStandardsMutation.mutateAsync,
    rejectStandards: rejectStandardsMutation.mutateAsync,
  }
}
