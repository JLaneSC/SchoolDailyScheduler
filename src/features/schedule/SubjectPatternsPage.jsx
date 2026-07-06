import { useParams } from 'react-router-dom'
import { useSubjects } from '../subjects/useSubjects'
import { useSubjectPatterns } from './useSubjectPatterns'
import { SubjectPatternRow } from './SubjectPatternRow'

export function SubjectPatternsPage() {
  const { studentId } = useParams()
  const { subjects, isLoading: subjectsLoading, error: subjectsError } = useSubjects()
  const { patterns, isLoading: patternsLoading, error: patternsError, upsertPattern } =
    useSubjectPatterns(studentId)

  const isLoading = subjectsLoading || patternsLoading
  const error = subjectsError || patternsError

  function patternFor(subjectId) {
    return patterns.find((pattern) => pattern.subject_id === subjectId)
  }

  return (
    <section>
      <h1>Weekly subject pattern</h1>
      <p>Choose which weekdays each subject is scheduled on for this student.</p>

      {isLoading && <p>Loading...</p>}
      {error && <p role="alert">Could not load patterns: {error.message}</p>}
      {!isLoading && !error && subjects.length === 0 && (
        <p>
          No subjects yet &mdash; add some on the <a href="/subjects">Subjects</a> page
          first.
        </p>
      )}

      <ul>
        {subjects.map((subject) => (
          <SubjectPatternRow
            key={subject.id}
            subject={subject}
            pattern={patternFor(subject.id)}
            onChange={(weekdays) =>
              upsertPattern({ studentId, subjectId: subject.id, ...weekdays })
            }
          />
        ))}
      </ul>
    </section>
  )
}
