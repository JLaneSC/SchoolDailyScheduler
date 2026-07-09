import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveActivityPlan } from './scheduleEntriesApi'
import { insertApprovedLinks, deleteLinks } from '../standardDistribution/scheduleEntryStandardsApi'

// Applies the teacher's chosen option for one entry from the next-day
// revision panel. The choice itself is the confirmation event (matches this
// app's confirm-before-write rule) — no extra pending_review round-trip for
// these writes, unlike Milestone 8's propose/review flow.
export function useApplyNextDayRevision(studentId) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ mode, entry }) => {
      if (mode === 'as-is') {
        return { mode }
      }

      const currentStandardIds = entry.currentStandards.map((s) => s.id)

      if (mode === 'replacement') {
        const nextStandardIds = entry.proposedStandards.map((s) => s.id)
        const droppedIds = currentStandardIds.filter((id) => !nextStandardIds.includes(id))
        const addedIds = nextStandardIds.filter((id) => !currentStandardIds.includes(id))

        await saveActivityPlan(entry.scheduleEntryId, entry.proposedActivityPlan)
        await deleteLinks(entry.scheduleEntryId, droppedIds)
        await insertApprovedLinks(
          addedIds.map((standardId) => ({ scheduleEntryId: entry.scheduleEntryId, standardId }))
        )
        return { mode }
      }

      if (mode === 'blend') {
        const nextStandardIds = entry.blendedStandards.map((s) => s.id)
        // A blend must never drop a currently-approved standard — assert
        // it client-side rather than trust the server response blindly,
        // matching this codebase's defensive-filtering pattern elsewhere.
        const isSuperset = currentStandardIds.every((id) => nextStandardIds.includes(id))
        if (!isSuperset) {
          throw new Error('Blend would drop a currently-approved standard — refusing to apply.')
        }
        const addedIds = nextStandardIds.filter((id) => !currentStandardIds.includes(id))

        await saveActivityPlan(entry.scheduleEntryId, entry.blendedActivityPlan)
        await insertApprovedLinks(
          addedIds.map((standardId) => ({ scheduleEntryId: entry.scheduleEntryId, standardId }))
        )
        return { mode }
      }

      throw new Error(`Unknown mode: ${mode}`)
    },
    onSuccess: (_result, { targetDate }) => {
      if (!targetDate) return
      const [year, month] = targetDate.split('-').map(Number)
      queryClient.invalidateQueries({ queryKey: ['scheduleEntries', studentId, year, month] })
      queryClient.invalidateQueries({ queryKey: ['scheduleEntryStandards'] })
    },
  })

  return {
    applyRevision: mutation.mutateAsync,
    isApplying: mutation.isPending,
    applyError: mutation.error,
  }
}
