import { useMutation } from '@tanstack/react-query'
import { fetchDailyActivitySuggestions } from './aiSuggestionsApi'

export function useAiSuggestions() {
  // Deliberately no onSuccess/invalidateQueries here: the result is
  // transient client-only UI state until the user explicitly saves a
  // suggestion via useSaveActivityPlan.
  const mutation = useMutation({
    mutationFn: ({ studentId, targetDate }) =>
      fetchDailyActivitySuggestions(studentId, targetDate),
  })

  return {
    generateSuggestions: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    generateError: mutation.error,
  }
}
