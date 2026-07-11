import { useState } from 'react'

export function SubjectGradeBandSelectionForm({
  subjects,
  gradeBands,
  hasPriorYear,
  onSubmit,
  isGenerating,
}) {
  const [includedSubjectIds, setIncludedSubjectIds] = useState(() => new Set())
  const [gradeBandsBySubject, setGradeBandsBySubject] = useState({})
  const [usePriorYearReuse, setUsePriorYearReuse] = useState(hasPriorYear)

  function toggleSubject(subjectId) {
    setIncludedSubjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(subjectId)) {
        next.delete(subjectId)
      } else {
        next.add(subjectId)
      }
      return next
    })
  }

  function toggleGradeBand(subjectId, gradeBandId) {
    setGradeBandsBySubject((prev) => {
      const current = new Set(prev[subjectId] ?? [])
      if (current.has(gradeBandId)) {
        current.delete(gradeBandId)
      } else {
        current.add(gradeBandId)
      }
      return { ...prev, [subjectId]: current }
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const selections = subjects
      .filter((subject) => includedSubjectIds.has(subject.id))
      .map((subject) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        gradeBandIds: [...(gradeBandsBySubject[subject.id] ?? [])],
      }))
      .filter((selection) => selection.gradeBandIds.length > 0)

    onSubmit(selections, usePriorYearReuse)
  }

  const hasValidSelection = subjects.some(
    (subject) => includedSubjectIds.has(subject.id) && (gradeBandsBySubject[subject.id]?.size ?? 0) > 0
  )

  return (
    <form onSubmit={handleSubmit}>
      <p>
        Pick which subjects to generate a full year's curriculum for, and
        which grade band(s) apply to each. Grade bands are never
        auto-matched from a student's grade level — pick explicitly for
        each subject.
      </p>

      <ul>
        {subjects.map((subject) => (
          <li key={subject.id}>
            <label>
              <input
                type="checkbox"
                checked={includedSubjectIds.has(subject.id)}
                onChange={() => toggleSubject(subject.id)}
              />
              {subject.name}
            </label>
            {includedSubjectIds.has(subject.id) && (
              <ul>
                {gradeBands.map((gradeBand) => (
                  <li key={gradeBand.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={(gradeBandsBySubject[subject.id] ?? new Set()).has(gradeBand.id)}
                        onChange={() => toggleGradeBand(subject.id, gradeBand.id)}
                      />
                      {gradeBand.label}
                    </label>
                  </li>
                ))}
                {gradeBands.length === 0 && <li>No grade bands set up yet.</li>}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {hasPriorYear && (
        <div>
          <label>
            <input
              type="checkbox"
              checked={usePriorYearReuse}
              onChange={(event) => setUsePriorYearReuse(event.target.checked)}
            />
            Reuse mastered standards from a prior school year (skip anything
            already marked mastered)
          </label>
        </div>
      )}

      <button type="submit" disabled={isGenerating || !hasValidSelection}>
        {isGenerating ? 'Generating...' : 'Generate curriculum'}
      </button>
    </form>
  )
}
