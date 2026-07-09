import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCurriculumPlan } from './useCurriculumPlan'
import { useExtractCurriculumPlan } from './useExtractCurriculumPlan'
import { useSaveCurriculumPlanEntries } from './useSaveCurriculumPlanEntries'
import { useSubjects } from '../subjects/useSubjects'
import { CurriculumPlanUploadForm } from './CurriculumPlanUploadForm'
import { SubjectMappingForm } from './SubjectMappingForm'
import { CurriculumPlanReviewItem } from './CurriculumPlanReviewItem'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function groupByMonthThenSubject(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const monthKey = `${entry.year}-${String(entry.month).padStart(2, '0')}`
    const monthLabel = `${MONTH_NAMES[entry.month - 1]} ${entry.year}`
    const subjectName = entry.subjects?.name ?? 'Unknown subject'
    const key = `${monthKey}||${subjectName}`
    const group = groups.get(key) ?? {
      monthKey,
      monthLabel,
      subjectName,
      subjectId: entry.subject_id,
      year: entry.year,
      month: entry.month,
      items: [],
    }
    group.items.push(entry)
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

export function CurriculumPlanPage() {
  const { studentId } = useParams()

  const {
    entries: pendingEntries,
    isLoading: isPendingLoading,
    error: pendingError,
    updateEntry,
    approveEntries,
    rejectEntries,
  } = useCurriculumPlan({ studentId, status: 'pending_review' })

  const { entries: approvedEntries, isLoading: isApprovedLoading } = useCurriculumPlan({
    studentId,
    status: 'approved',
  })

  const { subjects } = useSubjects()
  const { extractCurriculumPlan, isExtracting, extractError } = useExtractCurriculumPlan()
  const { saveCurriculumPlanEntries, isSaving, saveError } = useSaveCurriculumPlanEntries()

  const [pendingExtraction, setPendingExtraction] = useState(null)
  const [saveMessage, setSaveMessage] = useState(null)

  const pendingGroups = useMemo(() => groupByMonthThenSubject(pendingEntries), [pendingEntries])
  const approvedGroups = useMemo(() => groupByMonthThenSubject(approvedEntries), [approvedEntries])

  async function handleExtract(params) {
    setSaveMessage(null)
    const result = await extractCurriculumPlan(params)
    if (result.entries.length === 0) {
      setSaveMessage(result.message ?? 'No entries found for that month.')
      return
    }
    setPendingExtraction({ ...result, ...params })
  }

  async function handleConfirmMapping(subjectMapping) {
    const { entries, studentId: extractedStudentId, year, month, sourceFilename } = pendingExtraction
    const result = await saveCurriculumPlanEntries({
      entries,
      subjectMapping,
      studentId: extractedStudentId,
      year,
      month,
      sourceFilename,
    })
    setPendingExtraction(null)
    setSaveMessage(`Saved ${result.insertedCount} entr${result.insertedCount === 1 ? 'y' : 'ies'} for review.`)
  }

  return (
    <section>
      <h1>Curriculum plan</h1>

      {!pendingExtraction && (
        <>
          <h2>Extract from a curriculum document</h2>
          <CurriculumPlanUploadForm
            studentId={studentId}
            onExtract={handleExtract}
            isExtracting={isExtracting}
            extractError={extractError}
          />
          {saveMessage && <p>{saveMessage}</p>}
        </>
      )}

      {pendingExtraction && (
        <>
          <h2>Confirm subject mapping</h2>
          <SubjectMappingForm
            distinctNames={pendingExtraction.distinctNames}
            subjectSuggestions={pendingExtraction.subjectSuggestions}
            subjects={subjects}
            onConfirm={handleConfirmMapping}
            onCancel={() => setPendingExtraction(null)}
            isSaving={isSaving}
          />
          {saveError && <p role="alert">Could not save curriculum plan: {saveError.message}</p>}
        </>
      )}

      <h2>Pending review</h2>
      {isPendingLoading && <p>Loading...</p>}
      {pendingError && <p role="alert">Could not load curriculum plan: {pendingError.message}</p>}
      {!isPendingLoading && !pendingError && pendingEntries.length === 0 && (
        <p>Nothing pending review.</p>
      )}

      {pendingGroups.map((group) => (
        <div key={`${group.monthKey}||${group.subjectName}`}>
          <h3>
            {group.monthLabel} &mdash; {group.subjectName}
          </h3>
          <button
            type="button"
            onClick={() => approveEntries(group.items.map((item) => item.id))}
          >
            Approve all shown here
          </button>
          <ul>
            {group.items.map((entry) => (
              <CurriculumPlanReviewItem
                key={entry.id}
                entry={entry}
                subjects={subjects}
                onUpdate={updateEntry}
                onApprove={(id) => approveEntries([id])}
                onReject={(id) => rejectEntries([id])}
              />
            ))}
          </ul>
        </div>
      ))}

      <h2>Approved curriculum plan</h2>
      {isApprovedLoading && <p>Loading...</p>}
      {!isApprovedLoading && approvedEntries.length === 0 && <p>Nothing approved yet.</p>}

      {approvedGroups.map((group) => (
        <div key={`${group.monthKey}||${group.subjectName}`}>
          <h3>
            {group.monthLabel} &mdash; {group.subjectName}
          </h3>
          <p>
            <Link
              to={`/students/${studentId}/standard-distribution?subjectId=${group.subjectId}&year=${group.year}&month=${group.month}`}
            >
              Distribute standards to days &rarr;
            </Link>
          </p>
          <ul>
            {group.items.map((entry) => (
              <li key={entry.id}>
                {entry.focus_text}
                {entry.standards_text && ` (${entry.standards_text})`} &mdash;{' '}
                {entry.mastery_status}
                {entry.mastery_percentage != null && ` (${entry.mastery_percentage}%)`}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
