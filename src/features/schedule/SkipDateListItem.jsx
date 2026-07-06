export function SkipDateListItem({ skipDate, onDelete }) {
  const range =
    skipDate.start_date === skipDate.end_date
      ? skipDate.start_date
      : `${skipDate.start_date} to ${skipDate.end_date}`

  return (
    <li>
      {range}
      {skipDate.label && <span> &mdash; {skipDate.label}</span>}
      <button type="button" onClick={() => onDelete(skipDate.id)}>
        Remove
      </button>
    </li>
  )
}
