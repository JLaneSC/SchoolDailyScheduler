import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upsertProgressNote } from './progressNotesApi'

export function useProgressNotes(studentId, year, month) {
  const queryClient = useQueryClient()

  const upsertNoteMutation = useMutation({
    mutationFn: upsertProgressNote,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleEntries', studentId, year, month],
      })
    },
  })

  return {
    upsertNote: upsertNoteMutation.mutateAsync,
    isSaving: upsertNoteMutation.isPending,
  }
}
