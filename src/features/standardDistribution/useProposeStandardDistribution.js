import { useMutation } from '@tanstack/react-query'
import { proposeStandardDistribution } from './proposeStandardDistributionApi'

// Fully transient (like Milestone 4's useAiSuggestions) — no DB writes here.
// The teacher reviews/edits the proposal in StandardDistributionReviewForm
// before useSaveStandardDistribution inserts anything as pending_review.
export function useProposeStandardDistribution() {
  const mutation = useMutation({
    mutationFn: proposeStandardDistribution,
  })

  return {
    proposeDistribution: mutation.mutateAsync,
    isProposing: mutation.isPending,
    proposeError: mutation.error,
  }
}
