import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSubjects } from '../subjects/useSubjects'
import { useGradeBands } from '../gradeBands/useGradeBands'
import { useSchoolYear } from '../schedule/useSchoolYear'
import { useSchoolYears } from '../schedule/useSchoolYears'
import { useGenerateCurriculumPlan } from './useGenerateCurriculumPlan'
import { useSaveGeneratedCurriculumPlan } from './useSaveGeneratedCurriculumPlan'
import { SubjectGradeBandSelectionForm } from './SubjectGradeBandSelectionForm'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CurriculumGenerationPage() {
  const { studentId } = useParams()
  const navigate = useNavigate()

  const { subjects } = useSubjects()
  const { gradeBands } = useGradeBands()
  const { schoolYear } = useSchoolYear(studentId)
  const { schoolYears } = useSchoolYears(studentId)

  const { generatePlan, isGenerating, generateError, progress } = useGenerateCurriculumPlan()
  const { saveGeneratedPlan, isSaving, saveError } = useSaveGeneratedCurriculumPlan()

  const [results, setResults] = useState(null)
  const [usePriorYearReuse, setUsePriorYearReuse] = useState(false)

  const hasPriorYear =
    schoolYear != null && schoolYears.some((year) => year.end_date < schoolYear.start_date)

  async function handleGenerate(selections, priorYearReuse) {
    setUsePriorYearReuse(priorYearReuse)
    const generated = await generatePlan({
      studentId,
      schoolYearId: schoolYear.id,
      selections,
      usePriorYearReuse: priorYearReuse,
    })
    setResults(generated)
  }

  async function handleSave() {
    const gradeBandSummary = results
      .map((r) => `${r.subjectName}: ${r.gradeBandIds.length} band(s)`)
      .join('; ')
    const { insertedCount } = await saveGeneratedPlan({
      studentId,
      schoolYearId: schoolYear.id,
      usePriorYearReuse,
      gradeBandSummary,
      results,
    })
    navigate(`/students/${studentId}/curriculum-plan`, {
      state: { message: `Saved ${insertedCount} generated entries for review.` },
    })
  }

  if (!schoolYear) {
    return (
      <section>
        <h1>Generate curriculum</h1>
        <p>
          Set up a school year for this student first (start/end dates and
          weekly subject patterns) before generating a curriculum.
        </p>
        <Link to={`/students/${studentId}/school-year`}>Go to school year settings</Link>
      </section>
    )
  }

  return (
    <section>
      <h1>Generate curriculum</h1>
      <p>
        <Link to={`/students/${studentId}/curriculum-plan`}>Back to curriculum plan</Link>
      </p>
      <p>
        Generates a full year's curriculum directly from approved standards
        and this student's school year calendar ({schoolYear.start_date} to{' '}
        {schoolYear.end_date}) — no source document required.
      </p>

      {!results && (
        <SubjectGradeBandSelectionForm
          subjects={subjects}
          gradeBands={gradeBands}
          hasPriorYear={hasPriorYear}
          onSubmit={handleGenerate}
          isGenerating={isGenerating}
        />
      )}

      {isGenerating && (
        <p>
          Generating {progress.currentSubjectName ?? '...'} ({progress.completed}/
          {progress.total})
        </p>
      )}
      {generateError && <p role="alert">Could not generate: {generateError.message}</p>}

      {results && (
        <div>
          <h2>Review generated curriculum</h2>
          <p>Nothing is saved until you confirm below.</p>

          {results.map((subjectResult) => (
            <div key={subjectResult.subjectId}>
              <h3>{subjectResult.subjectName}</h3>
              {subjectResult.message && <p role="alert">{subjectResult.message}</p>}
              {subjectResult.excludedMasteredCount > 0 && (
                <p>
                  {subjectResult.excludedMasteredCount} standard(s) excluded as already
                  mastered.
                </p>
              )}
              {subjectResult.unusedStandardIds.length > 0 && (
                <p>{subjectResult.unusedStandardIds.length} candidate standard(s) not used.</p>
              )}
              <ul>
                {subjectResult.entries.map((entry) => (
                  <li key={`${entry.year}-${entry.month}`}>
                    <strong>
                      {MONTH_NAMES[entry.month - 1]} {entry.year}
                    </strong>
                    : {entry.focusText}
                    {entry.standardsText && ` (${entry.standardsText})`}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {saveError && <p role="alert">Could not save: {saveError.message}</p>}
          <button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Confirm and save all for review'}
          </button>
          <button type="button" onClick={() => setResults(null)} disabled={isSaving}>
            Start over
          </button>
        </div>
      )}
    </section>
  )
}
