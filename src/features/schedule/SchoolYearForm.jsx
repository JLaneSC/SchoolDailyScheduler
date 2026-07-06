import { useMemo, useState } from 'react'
import { checkShortfall } from './scheduleEngine'

const ADVANCED_WEEKDAYS = [
  { key: 'countsMonday', label: 'Monday' },
  { key: 'countsTuesday', label: 'Tuesday' },
  { key: 'countsWednesday', label: 'Wednesday' },
  { key: 'countsThursday', label: 'Thursday' },
  { key: 'countsFriday', label: 'Friday' },
  { key: 'countsSaturday', label: 'Saturday' },
  { key: 'countsSunday', label: 'Sunday' },
]

function toFormState(schoolYear) {
  return {
    label: schoolYear?.label ?? '',
    startDate: schoolYear?.start_date ?? '',
    endDate: schoolYear?.end_date ?? '',
    targetDays: schoolYear?.target_days ?? 180,
    countsMonday: schoolYear?.counts_monday ?? true,
    countsTuesday: schoolYear?.counts_tuesday ?? true,
    countsWednesday: schoolYear?.counts_wednesday ?? true,
    countsThursday: schoolYear?.counts_thursday ?? true,
    countsFriday: schoolYear?.counts_friday ?? true,
    countsSaturday: schoolYear?.counts_saturday ?? false,
    countsSunday: schoolYear?.counts_sunday ?? false,
  }
}

export function SchoolYearForm({ schoolYear, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(schoolYear))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shortfall = useMemo(() => {
    if (!form.startDate || !form.endDate) return null
    return checkShortfall(
      {
        start_date: form.startDate,
        end_date: form.endDate,
        target_days: Number(form.targetDays) || 0,
        counts_monday: form.countsMonday,
        counts_tuesday: form.countsTuesday,
        counts_wednesday: form.countsWednesday,
        counts_thursday: form.countsThursday,
        counts_friday: form.countsFriday,
        counts_saturday: form.countsSaturday,
        counts_sunday: form.countsSunday,
      },
      []
    )
  }, [form])

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({ ...form, targetDays: Number(form.targetDays) || 0 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="school-year-label">Label (optional)</label>
        <input
          id="school-year-label"
          type="text"
          value={form.label}
          onChange={(event) => update('label', event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="school-year-start">Start date</label>
        <input
          id="school-year-start"
          type="date"
          value={form.startDate}
          onChange={(event) => update('startDate', event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="school-year-end">End date</label>
        <input
          id="school-year-end"
          type="date"
          value={form.endDate}
          onChange={(event) => update('endDate', event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="school-year-target">Target school days</label>
        <input
          id="school-year-target"
          type="number"
          min="1"
          value={form.targetDays}
          onChange={(event) => update('targetDays', event.target.value)}
        />
      </div>

      {shortfall && shortfall.rawShortfall > 0 && (
        <p role="alert">
          This date range only has {shortfall.rawAvailable} school day(s) available
          &mdash; that's {shortfall.rawShortfall} short of your target of{' '}
          {form.targetDays}, before even counting any holidays/skip days. Extend the
          end date, move the start date earlier, or lower the target.
        </p>
      )}

      <button type="button" onClick={() => setShowAdvanced((prev) => !prev)}>
        {showAdvanced ? 'Hide' : 'Show'} advanced (which weekdays count as school days)
      </button>

      {showAdvanced && (
        <div>
          {ADVANCED_WEEKDAYS.map(({ key, label }) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(event) => update(key, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save school year'}
      </button>
    </form>
  )
}
