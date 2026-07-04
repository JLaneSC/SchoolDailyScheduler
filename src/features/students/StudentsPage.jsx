import { useStudents } from './useStudents'
import { StudentForm } from './StudentForm'
import { StudentListItem } from './StudentListItem'

export function StudentsPage() {
  const { students, isLoading, error, addStudent, updateStudent, deleteStudent } =
    useStudents()

  return (
    <section>
      <h1>Students</h1>

      <h2>Add a student</h2>
      <StudentForm onSubmit={addStudent} />

      <h2>Your students</h2>
      {isLoading && <p>Loading students...</p>}
      {error && <p role="alert">Could not load students: {error.message}</p>}
      {!isLoading && !error && students.length === 0 && <p>No students yet.</p>}

      <ul>
        {students.map((student) => (
          <StudentListItem
            key={student.id}
            student={student}
            onUpdate={updateStudent}
            onDelete={deleteStudent}
          />
        ))}
      </ul>
    </section>
  )
}
