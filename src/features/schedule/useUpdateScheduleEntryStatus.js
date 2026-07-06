import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateScheduleEntryStatus } from './scheduleEntriesApi'

export function useUpdateScheduleEntryStatus(studentId, year, month) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) => updateScheduleEntryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleEntries', studentId, year, month],
      })
    },
  })
}
