import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveActivityPlan } from './scheduleEntriesApi'

export function useSaveActivityPlan(studentId, year, month) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, activityPlan }) => saveActivityPlan(id, activityPlan),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleEntries', studentId, year, month],
      })
    },
  })
}
