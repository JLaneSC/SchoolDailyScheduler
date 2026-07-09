import { useState } from 'react'
import { useNextDayRevision } from './useNextDayRevision'
import { useApplyNextDayRevision } from './useApplyNextDayRevision'
import { ActivityPlanForm } from './ActivityPlanForm'
import { StandardCoverageDecisionForm } from './StandardCoverageDecisionForm'

export function NextDayRevisionPanel({ studentId, sourceDate }) {
  const { generateRevision, isGeneratingRevision, revisionError } = useNextDayRevision()
  const { applyRevision, isApplying, applyError } = useApplyNextDayRevision(studentId)

  const [revision, setRevision] = useState(null)
  const [message, setMessage] = useState(null)
  const [appliedEntryIds, setAppliedEntryIds] = useState(new Set())

  async function handleGenerate() {
    setMessage(null)
    setAppliedEntryIds(new Set())
    const result = await generateRevision({ studentId, sourceDate })
    if (result.entries.length === 0) {
      setMessage(result.message ?? 'No revision needed for the next scheduled day.')
      setRevision(null)
      return
    }
    setRevision(result)
  }

  async function handleApply(mode, entry) {
    await applyRevision({ mode, entry, targetDate: revision.targetDate })
    setAppliedEntryIds((prev) => new Set(prev).add(entry.scheduleEntryId))
  }

  const pendingEntries = revision
    ? revision.entries.filter((entry) => !appliedEntryIds.has(entry.scheduleEntryId))
    : []

  return (
    <div>
      <button type="button" onClick={handleGenerate} disabled={isGeneratingRevision}>
        {isGeneratingRevision ? 'Generating...' : "Suggest tomorrow's plan from today's notes"}
      </button>
      {revisionError && <p role="alert">Could not generate revision: {revisionError.message}</p>}
      {applyError && <p role="alert">Could not apply revision: {applyError.message}</p>}
      {message && <p>{message}</p>}

      {revision && pendingEntries.length === 0 && appliedEntryIds.size > 0 && (
        <p>All proposed changes for {revision.targetDate} have been applied.</p>
      )}

      {pendingEntries.map((entry) =>
        entry.lostStandards.length > 0 ? (
          <StandardCoverageDecisionForm
            key={entry.scheduleEntryId}
            entry={entry}
            targetDate={revision.targetDate}
            onApply={(mode) => handleApply(mode, entry)}
            isApplying={isApplying}
          />
        ) : (
          <div key={entry.scheduleEntryId}>
            <h4>{entry.subjectName} &mdash; {revision.targetDate}</h4>
            <ActivityPlanForm
              initialValue={entry.proposedActivityPlan}
              onSubmit={(value) =>
                handleApply('replacement', { ...entry, proposedActivityPlan: value })
              }
            />
          </div>
        )
      )}
    </div>
  )
}
