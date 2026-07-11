import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveEntries,
  getCurriculumPlanEntries,
  rejectEntries,
  updateEntry,
} from './curriculumPlanApi'

export function useCurriculumPlan({ studentId, status, year, month, generationRunId } = {}) {
  const queryClient = useQueryClient()
  const queryKey = ['curriculumPlanEntries', { studentId, status, year, month, generationRunId }]

  const entriesQuery = useQuery({
    queryKey,
    queryFn: () => getCurriculumPlanEntries({ studentId, status, year, month, generationRunId }),
    enabled: Boolean(studentId),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['curriculumPlanEntries'] })
  }

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, ...updates }) => updateEntry(id, updates),
    onSuccess: invalidate,
  })

  const approveEntriesMutation = useMutation({
    mutationFn: approveEntries,
    onSuccess: invalidate,
  })

  const rejectEntriesMutation = useMutation({
    mutationFn: rejectEntries,
    onSuccess: invalidate,
  })

  return {
    entries: entriesQuery.data ?? [],
    isLoading: entriesQuery.isLoading,
    error: entriesQuery.error,
    updateEntry: updateEntryMutation.mutateAsync,
    approveEntries: approveEntriesMutation.mutateAsync,
    rejectEntries: rejectEntriesMutation.mutateAsync,
  }
}
