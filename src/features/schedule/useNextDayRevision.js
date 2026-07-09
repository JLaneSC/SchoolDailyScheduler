import { useMutation } from '@tanstack/react-query'
import { fetchNextDayRevision } from './nextDayRevisionApi'

// Fully transient (like Milestone 4's useAiSuggestions) — no DB writes here.
// The teacher applies a chosen option (replacement / as-is / blend) per
// entry via useApplyNextDayRevision, which is the actual write.
export function useNextDayRevision() {
  const mutation = useMutation({
    mutationFn: ({ studentId, sourceDate }) => fetchNextDayRevision(studentId, sourceDate),
  })

  return {
    generateRevision: mutation.mutateAsync,
    isGeneratingRevision: mutation.isPending,
    revisionError: mutation.error,
  }
}
