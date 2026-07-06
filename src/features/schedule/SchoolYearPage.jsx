import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSchoolYear } from './useSchoolYear'
import { useSkipDates } from './useSkipDates'
import { useGenerateSchedule } from './useGenerateSchedule'
import { SchoolYearForm } from './SchoolYearForm'
import { SkipDateForm } from './SkipDateForm'
import { SkipDateListItem } from './SkipDateListItem'

export function SchoolYearPage() {
  const { studentId } = useParams()
  const { schoolYear, isLoading, error, saveSchoolYear } = useSchoolYear(studentId)
  const { skipDates, addSkipDate, deleteSkipDate } = useSkipDates(schoolYear?.id)
  const { computeDiff, isComputing, applyDiff, isApplying } = useGenerateSchedule(
    studentId,
    schoolYear?.id
  )

  const [diffPreview, setDiffPreview] = useState(null)
  const [applyResult, setApplyResult] = useState(null)

  async function handleSaveSchoolYear(fields) {
    await saveSchoolYear({ id: schoolYear?.id, studentId, ...fields })
    setDiffPreview(null)
    setApplyResult(null)
  }

  async function handleGenerateClick() {
    setApplyResult(null)
    const diff = await computeDiff()
    setDiffPreview(diff)
  }

  async function handleConfirmClick() {
    await applyDiff(diffPreview)
    setApplyResult({
      inserted: diffPreview.toInsert.length,
      updated: diffPreview.toUpdateDayNumber.length,
      deleted: diffPreview.toDelete.length,
    })
    setDiffPreview(null)
  }

  if (isLoading) return <p>Loading...</p>
  if (error) return <p role="alert">Could not load school year: {error.message}</p>

  return (
    <section>
      <h1>School year</h1>
      <SchoolYearForm schoolYear={schoolYear} onSubmit={handleSaveSchoolYear} />

      {schoolYear && (
        <>
          <h2>Holidays / skip days</h2>
          <SkipDateForm
            onSubmit={(fields) => addSkipDate({ schoolYearId: schoolYear.id, ...fields })}
          />
          <ul>
            {skipDates.map((skipDate) => (
              <SkipDateListItem
                key={skipDate.id}
                skipDate={skipDate}
                onDelete={deleteSkipDate}
              />
            ))}
          </ul>

          <h2>Generate schedule</h2>
          <button type="button" onClick={handleGenerateClick} disabled={isComputing}>
            {isComputing ? 'Checking...' : 'Generate / Regenerate schedule'}
          </button>

          {diffPreview?.blocked && (
            <p role="alert">
              This school year's date range only fits {diffPreview.effectiveAvailable}{' '}
              school day(s) after skip days &mdash; that's {diffPreview.effectiveShortfall}{' '}
              short of the target of {schoolYear.target_days}. Extend the end date, remove
              some skip days, or lower the target, then try again.
            </p>
          )}

          {diffPreview && !diffPreview.blocked && (
            <div>
              <p>
                This will add {diffPreview.toInsert.length} entr
                {diffPreview.toInsert.length === 1 ? 'y' : 'ies'}, update{' '}
                {diffPreview.toUpdateDayNumber.length} day number(s), and remove{' '}
                {diffPreview.toDelete.length} stale planned entr
                {diffPreview.toDelete.length === 1 ? 'y' : 'ies'}.
              </p>
              <button type="button" onClick={handleConfirmClick} disabled={isApplying}>
                {isApplying ? 'Applying...' : 'Confirm and apply'}
              </button>
              <button
                type="button"
                onClick={() => setDiffPreview(null)}
                disabled={isApplying}
              >
                Cancel
              </button>
            </div>
          )}

          {applyResult && (
            <p>
              Done: added {applyResult.inserted}, updated {applyResult.updated}, removed{' '}
              {applyResult.deleted}.
            </p>
          )}
        </>
      )}
    </section>
  )
}
