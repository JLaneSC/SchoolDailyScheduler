import { useState } from 'react'
import { GradeBandForm } from './GradeBandForm'

export function GradeBandListItem({ gradeBand, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <li>
        <GradeBandForm
          initialValues={gradeBand}
          submitLabel="Save changes"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (updates) => {
            await onUpdate({ id: gradeBand.id, ...updates })
            setIsEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li>
      <strong>{gradeBand.label}</strong>
      <span> &mdash; sort order {gradeBand.sort_order}</span>
      <button type="button" onClick={() => setIsEditing(true)}>
        Edit
      </button>
      <button type="button" onClick={() => onDelete(gradeBand.id)}>
        Delete
      </button>
    </li>
  )
}
