import { useState } from 'react'

export function SupplyItemForm({ initialValues, onSubmit, onCancel, submitLabel = 'Add item' }) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [quantity, setQuantity] = useState(initialValues?.quantity ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate() {
    const nextErrors = {}
    if (!name.trim()) nextErrors.name = 'Name is required.'
    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), quantity, notes: notes.trim() })
      if (!initialValues) {
        setName('')
        setQuantity('')
        setNotes('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="supply-item-name">Name</label>
        <input
          id="supply-item-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {errors.name && <p role="alert">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="supply-item-quantity">Quantity (optional)</label>
        <input
          id="supply-item-quantity"
          type="number"
          min="0"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="supply-item-notes">Notes (optional)</label>
        <textarea
          id="supply-item-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      )}
    </form>
  )
}
