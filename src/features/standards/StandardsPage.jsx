import { useMemo } from 'react'
import { useStandards } from './useStandards'
import { useIngestStandards } from './useIngestStandards'
import { useGradeBands } from '../gradeBands/useGradeBands'
import { StandardUploadForm } from './StandardUploadForm'
import { StandardReviewItem } from './StandardReviewItem'

function groupBySubjectAndGradeBand(standards) {
  const groups = new Map()
  for (const standard of standards) {
    const subjectName = standard.subjects?.name ?? 'Unknown subject'
    const gradeBandLabel = standard.grade_bands?.label ?? 'No grade band'
    const key = `${subjectName}||${gradeBandLabel}`
    const group = groups.get(key) ?? { subjectName, gradeBandLabel, items: [] }
    group.items.push(standard)
    groups.set(key, group)
  }
  return [...groups.values()]
}

export function StandardsPage() {
  const {
    standards: pendingStandards,
    isLoading: isPendingLoading,
    error: pendingError,
    updateStandard,
    approveStandards,
    rejectStandards,
  } = useStandards({ status: 'pending_review' })

  const { standards: approvedStandards, isLoading: isApprovedLoading } = useStandards({
    status: 'approved',
  })

  const { gradeBands } = useGradeBands()
  const { ingestStandards, isIngesting, ingestError } = useIngestStandards()

  const pendingGroups = useMemo(() => groupBySubjectAndGradeBand(pendingStandards), [
    pendingStandards,
  ])
  const approvedGroups = useMemo(() => groupBySubjectAndGradeBand(approvedStandards), [
    approvedStandards,
  ])

  return (
    <section>
      <h1>Standards</h1>

      <h2>Extract standards from a document</h2>
      <StandardUploadForm
        onIngest={ingestStandards}
        isIngesting={isIngesting}
        ingestError={ingestError}
      />

      <h2>Pending review</h2>
      {isPendingLoading && <p>Loading...</p>}
      {pendingError && <p role="alert">Could not load standards: {pendingError.message}</p>}
      {!isPendingLoading && !pendingError && pendingStandards.length === 0 && (
        <p>Nothing pending review.</p>
      )}

      {pendingGroups.map((group) => (
        <div key={`${group.subjectName}||${group.gradeBandLabel}`}>
          <h3>
            {group.subjectName} &mdash; {group.gradeBandLabel}
          </h3>
          <button
            type="button"
            onClick={() => approveStandards(group.items.map((item) => item.id))}
          >
            Approve all shown here
          </button>
          <ul>
            {group.items.map((standard) => (
              <StandardReviewItem
                key={standard.id}
                standard={standard}
                gradeBands={gradeBands}
                onUpdate={updateStandard}
                onApprove={(id) => approveStandards([id])}
                onReject={(id) => rejectStandards([id])}
              />
            ))}
          </ul>
        </div>
      ))}

      <h2>Approved standards</h2>
      {isApprovedLoading && <p>Loading...</p>}
      {!isApprovedLoading && approvedStandards.length === 0 && <p>No approved standards yet.</p>}

      {approvedGroups.map((group) => (
        <div key={`${group.subjectName}||${group.gradeBandLabel}`}>
          <h3>
            {group.subjectName} &mdash; {group.gradeBandLabel}
          </h3>
          <ul>
            {group.items.map((standard) => (
              <li key={standard.id}>
                {standard.code && <strong>{standard.code}</strong>} {standard.description}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
