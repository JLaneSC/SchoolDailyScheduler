import { useState } from 'react'
import { ProgressNoteForm } from './ProgressNoteForm'
import { ActivityPlanForm } from './ActivityPlanForm'

const STATUSES = ['planned', 'completed', 'skipped']

export function DayScheduleEntryItem({
  entry,
  onUpdateStatus,
  onUpsertNote,
  suggestedActivity,
  onSaveActivityPlan,
  onDiscardSuggestion,
}) {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isEditingPlan, setIsEditingPlan] = useState(false)

  // Auto-open the plan form the moment a fresh suggestion arrives for this
  // entry, without an effect (React's recommended "adjust state during
  // render" pattern for syncing local state to a changed prop).
  const [lastSuggestedActivity, setLastSuggestedActivity] = useState(suggestedActivity)
  if (suggestedActivity !== lastSuggestedActivity) {
    setLastSuggestedActivity(suggestedActivity)
    if (suggestedActivity) {
      setIsEditingPlan(true)
    }
  }

  async function handleSavePlan(value) {
    await onSaveActivityPlan({ id: entry.id, activityPlan: value })
    setIsEditingPlan(false)
  }

  function handleCancelPlan() {
    setIsEditingPlan(false)
    if (suggestedActivity && onDiscardSuggestion) {
      onDiscardSuggestion(entry.id)
    }
  }

  return (
    <li>
      <strong>{entry.subjects?.name ?? 'Subject'}</strong>
      {entry.day_number && <span> (day {entry.day_number})</span>}
      {entry.approvedStandards?.length > 0 && (
        <div>
          Standards: {entry.approvedStandards.map((s) => s.code).join(', ')}
        </div>
      )}
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

      {isEditingPlan ? (
        <ActivityPlanForm
          initialValue={suggestedActivity ?? entry.activity_plan ?? ''}
          onCancel={handleCancelPlan}
          onSubmit={handleSavePlan}
        />
      ) : (
        <div>
          <span>{entry.activity_plan ? 'Activity plan set' : 'No activity plan yet'}</span>
          <button type="button" onClick={() => setIsEditingPlan(true)}>
            {entry.activity_plan ? 'Edit plan' : 'Add plan'}
          </button>
        </div>
      )}
    </li>
  )
}
