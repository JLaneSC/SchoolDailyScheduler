import { useState } from 'react'

export function StandardDistributionReviewForm({
  proposals,
  candidateStandards,
  unmatchedTokens,
  onConfirm,
  onCancel,
  isSaving,
}) {
  const [selections, setSelections] = useState(() =>
    Object.fromEntries(
      proposals.map((proposal) => [proposal.scheduleEntryId, new Set(proposal.standardIds)])
    )
  )

  function toggleStandard(scheduleEntryId, standardId) {
    setSelections((prev) => {
      const next = new Set(prev[scheduleEntryId])
      if (next.has(standardId)) {
        next.delete(standardId)
      } else {
        next.add(standardId)
      }
      return { ...prev, [scheduleEntryId]: next }
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const links = []
    for (const proposal of proposals) {
      for (const standardId of selections[proposal.scheduleEntryId]) {
        links.push({ scheduleEntryId: proposal.scheduleEntryId, standardId })
      }
    }
    onConfirm(links)
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>
        Review which standards each scheduled day should target before
        anything is saved. Nothing is written until you confirm.
      </p>

      {unmatchedTokens.length > 0 && (
        <p role="alert">
          Not matched to an approved standard: {unmatchedTokens.join(', ')}
        </p>
      )}

      <ul>
        {proposals.map((proposal) => (
          <li key={proposal.scheduleEntryId}>
            <strong>{proposal.scheduledDate}</strong>
            <ul>
              {candidateStandards.map((standard) => (
                <li key={standard.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selections[proposal.scheduleEntryId].has(standard.id)}
                      onChange={() => toggleStandard(proposal.scheduleEntryId, standard.id)}
                    />
                    {standard.code} &mdash; {standard.description}
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Confirm and save for review'}
      </button>
      <button type="button" onClick={onCancel} disabled={isSaving}>
        Cancel
      </button>
    </form>
  )
}
