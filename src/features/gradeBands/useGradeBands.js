import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addGradeBand,
  deleteGradeBand,
  getGradeBands,
  updateGradeBand,
} from './gradeBandsApi'

const GRADE_BANDS_QUERY_KEY = ['gradeBands']

export function useGradeBands() {
  const queryClient = useQueryClient()

  const gradeBandsQuery = useQuery({
    queryKey: GRADE_BANDS_QUERY_KEY,
    queryFn: getGradeBands,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: GRADE_BANDS_QUERY_KEY })
  }

  const addGradeBandMutation = useMutation({
    mutationFn: addGradeBand,
    onSuccess: invalidate,
  })

  const updateGradeBandMutation = useMutation({
    mutationFn: ({ id, ...updates }) => updateGradeBand(id, updates),
    onSuccess: invalidate,
  })

  const deleteGradeBandMutation = useMutation({
    mutationFn: deleteGradeBand,
    onSuccess: invalidate,
  })

  return {
    gradeBands: gradeBandsQuery.data ?? [],
    isLoading: gradeBandsQuery.isLoading,
    error: gradeBandsQuery.error,
    addGradeBand: addGradeBandMutation.mutateAsync,
    updateGradeBand: updateGradeBandMutation.mutateAsync,
    deleteGradeBand: deleteGradeBandMutation.mutateAsync,
  }
}
