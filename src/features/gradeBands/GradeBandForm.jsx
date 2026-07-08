import { useState } from 'react'

export function GradeBandForm({ initialValues, onSubmit, onCancel, submitLabel = 'Add grade band' }) {
  const [label, setLabel] = useState(initialValues?.label ?? '')
  const [sortOrder, setSortOrder] = useState(initialValues?.sort_order ?? 0)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate() {
    const nextErrors = {}
    if (!label.trim()) nextErrors.label = 'Label is required.'
    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({ label: label.trim(), sortOrder: Number(sortOrder) || 0 })
      if (!initialValues) {
        setLabel('')
        setSortOrder(0)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="grade-band-label">Label</label>
        <input
          id="grade-band-label"
          type="text"
          placeholder="e.g. Grade 1, K-2, Middle Level"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        {errors.label && <p role="alert">{errors.label}</p>}
      </div>

      <div>
        <label htmlFor="grade-band-sort-order">Sort order</label>
        <input
          id="grade-band-sort-order"
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
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
