import { Link, useParams } from 'react-router-dom'
import { useScheduleEntries } from './useScheduleEntries'
import { useUpdateScheduleEntryStatus } from './useUpdateScheduleEntryStatus'

const STATUSES = ['planned', 'completed', 'skipped']

export function DayDetailPage() {
  const { studentId, year, month, day } = useParams()
  const numericYear = Number(year)
  const numericMonth = Number(month)
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const { entries, isLoading, error } = useScheduleEntries(
    studentId,
    numericYear,
    numericMonth
  )
  const updateStatus = useUpdateScheduleEntryStatus(studentId, numericYear, numericMonth)

  const dayEntries = entries.filter((entry) => entry.scheduled_date === dateStr)

  return (
    <section>
      <h1>{dateStr}</h1>
      <p>
        <Link to={`/students/${studentId}/schedule/${year}/${month}`}>
          Back to calendar
        </Link>
      </p>

      {isLoading && <p>Loading...</p>}
      {error && <p role="alert">Could not load schedule: {error.message}</p>}
      {!isLoading && !error && dayEntries.length === 0 && (
        <p>No subjects scheduled this day.</p>
      )}

      <ul>
        {dayEntries.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.subjects?.name ?? 'Subject'}</strong>
            {entry.day_number && <span> (day {entry.day_number})</span>}
            <div>
              {STATUSES.map((status) => (
                <label key={status}>
                  <input
                    type="radio"
                    name={`status-${entry.id}`}
                    checked={entry.status === status}
                    onChange={() => updateStatus.mutate({ id: entry.id, status })}
                  />
                  {status}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
