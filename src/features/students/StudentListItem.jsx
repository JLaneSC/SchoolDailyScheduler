import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StudentForm } from './StudentForm'

export function StudentListItem({ student, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <li>
        <StudentForm
          initialValues={student}
          submitLabel="Save changes"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (updates) => {
            await onUpdate({ id: student.id, ...updates })
            setIsEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li>
      <strong>{student.name}</strong> &mdash; {student.grade_level}
      {student.birth_date && <span> &middot; born {student.birth_date}</span>}
      {student.notes && <p>{student.notes}</p>}
      <Link to={`/students/${student.id}`}>View schedule</Link>
      <button type="button" onClick={() => setIsEditing(true)}>
        Edit
      </button>
      <button type="button" onClick={() => onDelete(student.id)}>
        Delete
      </button>
    </li>
  )
}
