const WEEKDAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
]

export function SubjectPatternRow({ subject, pattern, onChange }) {
  const weekdayValues = Object.fromEntries(
    WEEKDAYS.map(({ key }) => [key, pattern?.[key] ?? false])
  )
  const startDate = pattern?.start_date ?? ''
  const endDate = pattern?.end_date ?? ''

  function updateWeekday(key, value) {
    onChange({ ...weekdayValues, [key]: value, startDate, endDate })
  }

  function setAll(value) {
    onChange({
      ...Object.fromEntries(WEEKDAYS.map(({ key }) => [key, value])),
      startDate,
      endDate,
    })
  }

  function updateDateRange(field, value) {
    onChange({ ...weekdayValues, startDate, endDate, [field]: value })
  }

  return (
    <li>
      <strong>{subject.name}</strong>
      {WEEKDAYS.map(({ key, label }) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={weekdayValues[key]}
            onChange={(event) => updateWeekday(key, event.target.checked)}
          />
          {label}
        </label>
      ))}
      <button type="button" onClick={() => setAll(true)}>
        Every day
      </button>
      <button type="button" onClick={() => setAll(false)}>
        Clear
      </button>

      <label>
        Active from (optional)
        <input
          type="date"
          value={startDate}
          onChange={(event) => updateDateRange('startDate', event.target.value)}
        />
      </label>
      <label>
        Active until (optional)
        <input
          type="date"
          value={endDate}
          onChange={(event) => updateDateRange('endDate', event.target.value)}
        />
      </label>
    </li>
  )
}
