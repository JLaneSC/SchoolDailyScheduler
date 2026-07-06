import { useState } from 'react'
import { SupplyItemForm } from './SupplyItemForm'

export function SupplyItemListItem({ item, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <li>
        <SupplyItemForm
          initialValues={item}
          submitLabel="Save changes"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (updates) => {
            await onUpdate({ id: item.id, ...updates })
            setIsEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li>
      <strong>{item.name}</strong>
      {item.quantity != null && <span> &mdash; qty {item.quantity}</span>}
      {item.notes && <p>{item.notes}</p>}
      <button type="button" onClick={() => setIsEditing(true)}>
        Edit
      </button>
      <button type="button" onClick={() => onDelete(item.id)}>
        Delete
      </button>
    </li>
  )
}
