import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insertPendingLinks } from './scheduleEntryStandardsApi'

// Runs only after the teacher has reviewed/edited the proposed distribution
// in StandardDistributionReviewForm and clicked "Confirm and save for
// review". Rows land as pending_review, same as every other AI-proposed
// dataset in this app (M6 standards, M7 curriculum plan) — approved via a
// separate explicit Approve action, never on insert.
export function useSaveStandardDistribution() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ links }) => {
      const inserted = await insertPendingLinks(links)
      return { insertedCount: inserted.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleEntryStandards'] })
    },
  })

  return {
    saveDistribution: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  }
}
