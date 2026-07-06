import { useState } from 'react'
import { SubjectForm } from './SubjectForm'

export function SubjectListItem({ subject, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <li>
        <SubjectForm
          initialValues={subject}
          submitLabel="Save changes"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (updates) => {
            await onUpdate({ id: subject.id, ...updates })
            setIsEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li>
      <strong>{subject.name}</strong>
      {subject.description && <p>{subject.description}</p>}
      <button type="button" onClick={() => setIsEditing(true)}>
        Edit
      </button>
      <button type="button" onClick={() => onDelete(subject.id)}>
        Delete
      </button>
    </li>
  )
}
