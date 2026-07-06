import { useState } from 'react'

export function SkipDateForm({ onSubmit }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [label, setLabel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!startDate) return

    setIsSubmitting(true)
    try {
      await onSubmit({ startDate, endDate: endDate || startDate, label: label.trim() })
      setStartDate('')
      setEndDate('')
      setLabel('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="skip-date-start">Start date</label>
        <input
          id="skip-date-start"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="skip-date-end">End date (optional, for a range)</label>
        <input
          id="skip-date-end"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="skip-date-label">Label (optional)</label>
        <input
          id="skip-date-label"
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>
      <button type="submit" disabled={isSubmitting || !startDate}>
        {isSubmitting ? 'Adding...' : 'Add skip date'}
      </button>
    </form>
  )
}
