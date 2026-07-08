import { useState } from 'react'

export function ActivityPlanForm({ initialValue, onSubmit, onCancel }) {
  const [value, setValue] = useState(initialValue ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(value.trim())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="activity-plan">Activity plan</label>
        <textarea
          id="activity-plan"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      )}
    </form>
  )
}
