import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useStandardDistribution } from './useStandardDistribution'
import { useProposeStandardDistribution } from './useProposeStandardDistribution'
import { useSaveStandardDistribution } from './useSaveStandardDistribution'
import { StandardDistributionReviewForm } from './StandardDistributionReviewForm'
import { StandardDistributionReviewItem } from './StandardDistributionReviewItem'

export function StandardDistributionPage() {
  const { studentId } = useParams()
  const [searchParams] = useSearchParams()
  const subjectId = searchParams.get('subjectId')
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  const {
    links: pendingLinks,
    isLoading: isPendingLoading,
    error: pendingError,
    approveLinks,
    rejectLinks,
  } = useStandardDistribution({ studentId, subjectId, year, month, status: 'pending_review' })

  const { links: approvedLinks, isLoading: isApprovedLoading } = useStandardDistribution({
    studentId,
    subjectId,
    year,
    month,
    status: 'approved',
  })

  const { proposeDistribution, isProposing, proposeError } = useProposeStandardDistribution()
  const { saveDistribution, isSaving, saveError } = useSaveStandardDistribution()

  const [proposal, setProposal] = useState(null)
  const [message, setMessage] = useState(null)

  async function handlePropose() {
    setMessage(null)
    const result = await proposeDistribution({ studentId, subjectId, year, month })
    if (result.proposals.length === 0) {
      setMessage(result.message ?? 'No proposals returned.')
      return
    }
    setProposal(result)
  }

  async function handleConfirm(links) {
    const result = await saveDistribution({ links })
    setProposal(null)
    setMessage(`Saved ${result.insertedCount} link${result.insertedCount === 1 ? '' : 's'} for review.`)
  }

  return (
    <section>
      <h1>Standard distribution</h1>
      <p>
        <Link to={`/students/${studentId}/curriculum-plan`}>Back to curriculum plan</Link>
      </p>

      {!proposal && (
        <>
          <button type="button" onClick={handlePropose} disabled={isProposing}>
            {isProposing ? 'Proposing...' : 'Propose distribution'}
          </button>
          {proposeError && (
            <p role="alert">Could not propose distribution: {proposeError.message}</p>
          )}
          {message && <p>{message}</p>}
        </>
      )}

      {proposal && (
        <>
          <h2>Confirm distribution</h2>
          <StandardDistributionReviewForm
            proposals={proposal.proposals}
            candidateStandards={proposal.candidateStandards}
            unmatchedTokens={proposal.unmatchedTokens}
            onConfirm={handleConfirm}
            onCancel={() => setProposal(null)}
            isSaving={isSaving}
          />
          {saveError && <p role="alert">Could not save distribution: {saveError.message}</p>}
        </>
      )}

      <h2>Pending review</h2>
      {isPendingLoading && <p>Loading...</p>}
      {pendingError && <p role="alert">Could not load links: {pendingError.message}</p>}
      {!isPendingLoading && !pendingError && pendingLinks.length === 0 && (
        <p>Nothing pending review.</p>
      )}
      <ul>
        {pendingLinks.map((link) => (
          <StandardDistributionReviewItem
            key={link.id}
            link={link}
            onApprove={(id) => approveLinks([id])}
            onReject={(id) => rejectLinks([id])}
          />
        ))}
      </ul>

      <h2>Approved</h2>
      {isApprovedLoading && <p>Loading...</p>}
      {!isApprovedLoading && approvedLinks.length === 0 && <p>No approved links yet.</p>}
      <ul>
        {approvedLinks.map((link) => (
          <li key={link.id}>
            {link.schedule_entries?.scheduled_date} &mdash; <strong>{link.standards?.code}</strong>{' '}
            {link.standards?.description}
          </li>
        ))}
      </ul>
    </section>
  )
}
