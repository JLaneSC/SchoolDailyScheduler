import { useMutation, useQueryClient } from '@tanstack/react-query'
import { extractStandardsFromDocument } from './ingestStandardsApi'
import { insertPendingStandards } from './standardsApi'
import { findOrCreateGradeBand } from '../gradeBands/gradeBandsApi'

// Deliberately not fully transient like useAiSuggestions (Milestone 4) —
// extracted rows are persisted as 'pending_review' immediately, since a
// large extraction batch (100+ entries for some documents) shouldn't be
// lost to a page refresh before the user finishes reviewing it. The review
// step then edits/approves/rejects rows that already live in the table.
export function useIngestStandards() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ fileBase64, subjectId, scopeInstruction, sourceFilename }) => {
      const result = await extractStandardsFromDocument({
        fileBase64,
        subjectId,
        scopeInstruction,
        sourceFilename,
      })

      const entries = result.entries ?? []
      if (entries.length === 0) return { ...result, insertedCount: 0 }

      const distinctLabels = [...new Set(entries.map((entry) => entry.gradeBandLabel))]
      const gradeBandByLabel = new Map()
      for (const label of distinctLabels) {
        const gradeBand = await findOrCreateGradeBand(label)
        gradeBandByLabel.set(label, gradeBand.id)
      }

      const rows = entries.map((entry, index) => ({
        subjectId,
        gradeBandId: gradeBandByLabel.get(entry.gradeBandLabel),
        code: entry.code,
        description: entry.description,
        sortOrder: index,
        sourceDocument: sourceFilename,
      }))

      const inserted = await insertPendingStandards(rows)
      return { ...result, insertedCount: inserted.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards'] })
    },
  })

  return {
    ingestStandards: mutation.mutateAsync,
    isIngesting: mutation.isPending,
    ingestError: mutation.error,
  }
}
