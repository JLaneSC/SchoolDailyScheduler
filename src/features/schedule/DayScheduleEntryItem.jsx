import { useState } from 'react'
import { ProgressNoteForm } from './ProgressNoteForm'

const STATUSES = ['planned', 'completed', 'skipped']

export function DayScheduleEntryItem({ entry, onUpdateStatus, onUpsertNote }) {
  const [isEditingNote, setIsEditingNote] = useState(false)

  return (
    <li>
      <strong>{entry.subjects?.name ?? 'Subject'}</strong>
      {entry.day_number && <span> (day {entry.day_number})</span>}
      <div>
        {STATUSES.map((status) => (
          <label key={status}>
            <input
              type="radio"
              name={`status-${entry.id}`}
              checked={entry.status === status}
              onChange={() => onUpdateStatus({ id: entry.id, status })}
            />
            {status}
          </label>
        ))}
      </div>

      {isEditingNote ? (
        <ProgressNoteForm
          initialValues={entry.progressNote}
          onCancel={() => setIsEditingNote(false)}
          onSubmit={async (values) => {
            await onUpsertNote({
              scheduleEntryId: entry.id,
              studentId: entry.student_id,
              subjectId: entry.subject_id,
              entryDate: entry.scheduled_date,
              ...values,
            })
            setIsEditingNote(false)
          }}
        />
      ) : (
        <div>
          <span>{entry.progressNote ? 'Progress note added' : 'No progress note yet'}</span>
          <button type="button" onClick={() => setIsEditingNote(true)}>
            {entry.progressNote ? 'Edit note' : 'Add note'}
          </button>
        </div>
      )}
    </li>
  )
}
