import { useState } from 'react'

const MASTERY_STATUSES = ['mastered', 'developing', 'not_assessed', 'planned']

export function CurriculumPlanReviewItem({ entry, subjects, onUpdate, onApprove, onReject }) {
  const [isEditing, setIsEditing] = useState(false)
  const [subjectId, setSubjectId] = useState(entry.subject_id)
  const [focusText, setFocusText] = useState(entry.focus_text)
  const [standardsText, setStandardsText] = useState(entry.standards_text ?? '')
  const [masteryStatus, setMasteryStatus] = useState(entry.mastery_status)
  const [masteryPercentage, setMasteryPercentage] = useState(entry.mastery_percentage ?? '')

  async function handleSave(event) {
    event.preventDefault()
    await onUpdate({
      id: entry.id,
      subjectId,
      focusText: focusText.trim(),
      standardsText: standardsText.trim() || null,
      masteryStatus,
      masteryPercentage: masteryPercentage === '' ? null : Number(masteryPercentage),
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <li>
        <form onSubmit={handleSave}>
          <div>
            <label htmlFor={`subject-${entry.id}`}>Subject</label>
            <select
              id={`subject-${entry.id}`}
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`focus-${entry.id}`}>Focus</label>
            <textarea
              id={`focus-${entry.id}`}
              value={focusText}
              onChange={(event) => setFocusText(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`standards-${entry.id}`}>Standards</label>
            <input
              id={`standards-${entry.id}`}
              type="text"
              value={standardsText}
              onChange={(event) => setStandardsText(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`mastery-status-${entry.id}`}>Mastery status</label>
            <select
              id={`mastery-status-${entry.id}`}
              value={masteryStatus}
              onChange={(event) => setMasteryStatus(event.target.value)}
            >
              {MASTERY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`mastery-pct-${entry.id}`}>Mastery percentage (optional)</label>
            <input
              id={`mastery-pct-${entry.id}`}
              type="number"
              min="0"
              max="100"
              value={masteryPercentage}
              onChange={(event) => setMasteryPercentage(event.target.value)}
            />
          </div>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </form>
      </li>
    )
  }

  return (
    <li>
      <strong>{entry.subjects?.name ?? 'Subject'}</strong>
      <span> &mdash; {entry.focus_text}</span>
      {entry.standards_text && <span> ({entry.standards_text})</span>}
      <div>
        {entry.mastery_status}
        {entry.mastery_percentage != null && ` (${entry.mastery_percentage}%)`}
      </div>
      <div>
        <button type="button" onClick={() => setIsEditing(true)}>
          Edit
        </button>
        <button type="button" onClick={() => onApprove(entry.id)}>
          Approve
        </button>
        <button type="button" onClick={() => onReject(entry.id)}>
          Reject
        </button>
      </div>
    </li>
  )
}
