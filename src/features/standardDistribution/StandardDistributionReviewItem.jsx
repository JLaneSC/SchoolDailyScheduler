export function StandardDistributionReviewItem({ link, onApprove, onReject }) {
  return (
    <li>
      <span>{link.schedule_entries?.scheduled_date}</span>
      <strong> {link.standards?.code}</strong>
      <span> &mdash; {link.standards?.description}</span>
      <div>
        <button type="button" onClick={() => onApprove(link.id)}>
          Approve
        </button>
        <button type="button" onClick={() => onReject(link.id)}>
          Reject
        </button>
      </div>
    </li>
  )
}
