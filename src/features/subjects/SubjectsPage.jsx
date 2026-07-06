import { useSubjects } from './useSubjects'
import { SubjectForm } from './SubjectForm'
import { SubjectListItem } from './SubjectListItem'

export function SubjectsPage() {
  const { subjects, isLoading, error, addSubject, updateSubject, deleteSubject } =
    useSubjects()

  return (
    <section>
      <h1>Subjects</h1>

      <h2>Add a subject</h2>
      <SubjectForm onSubmit={addSubject} />

      <h2>Your subjects</h2>
      {isLoading && <p>Loading subjects...</p>}
      {error && <p role="alert">Could not load subjects: {error.message}</p>}
      {!isLoading && !error && subjects.length === 0 && <p>No subjects yet.</p>}

      <ul>
        {subjects.map((subject) => (
          <SubjectListItem
            key={subject.id}
            subject={subject}
            onUpdate={updateSubject}
            onDelete={deleteSubject}
          />
        ))}
      </ul>
    </section>
  )
}
