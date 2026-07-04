import { useState } from 'react'

const GRADE_LEVELS = [
  'Pre-K',
  'Kindergarten',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
]

export function StudentForm({ initialValues, onSubmit, onCancel, submitLabel = 'Add student' }) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [gradeLevel, setGradeLevel] = useState(initialValues?.grade_level ?? '')
  const [birthDate, setBirthDate] = useState(initialValues?.birth_date ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate() {
    const nextErrors = {}
    if (!name.trim()) nextErrors.name = 'Name is required.'
    if (!gradeLevel) nextErrors.gradeLevel = 'Grade level is required.'
    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), gradeLevel, birthDate, notes: notes.trim() })
      if (!initialValues) {
        setName('')
        setGradeLevel('')
        setBirthDate('')
        setNotes('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="student-name">Name</label>
        <input
          id="student-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {errors.name && <p role="alert">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="student-grade">Grade level</label>
        <select
          id="student-grade"
          value={gradeLevel}
          onChange={(event) => setGradeLevel(event.target.value)}
        >
          <option value="">Select a grade</option>
          {GRADE_LEVELS.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
        {errors.gradeLevel && <p role="alert">{errors.gradeLevel}</p>}
      </div>

      <div>
        <label htmlFor="student-birth-date">Birth date (optional)</label>
        <input
          id="student-birth-date"
          type="date"
          value={birthDate ?? ''}
          onChange={(event) => setBirthDate(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="student-notes">Notes (optional)</label>
        <textarea
          id="student-notes"
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
