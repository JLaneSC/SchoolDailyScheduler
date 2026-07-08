import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useScheduleEntries } from './useScheduleEntries'
import { MonthGrid } from './MonthGrid'
import { buildIcsCalendar, buildMarkdownDocument } from './exportFormats'
import { downloadFile } from '../../lib/downloadFile'

export function CalendarRedirect() {
  const { studentId } = useParams()
  const now = new Date()
  return (
    <Navigate
      to={`/students/${studentId}/schedule/${now.getFullYear()}/${now.getMonth() + 1}`}
      replace
    />
  )
}

export function CalendarPage() {
  const { studentId, year, month } = useParams()
  const navigate = useNavigate()
  const numericYear = Number(year)
  const numericMonth = Number(month)

  const { entries, isLoading, error } = useScheduleEntries(
    studentId,
    numericYear,
    numericMonth
  )

  const entriesByDate = useMemo(() => {
    const map = new Map()
    for (const entry of entries) {
      const list = map.get(entry.scheduled_date) ?? []
      list.push(entry)
      map.set(entry.scheduled_date, list)
    }
    return map
  }, [entries])

  function goToMonth(offset) {
    const date = new Date(Date.UTC(numericYear, numericMonth - 1 + offset, 1))
    navigate(
      `/students/${studentId}/schedule/${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`
    )
  }

  function handleSelectDay(dateStr) {
    const day = Number(dateStr.split('-')[2])
    navigate(`/students/${studentId}/schedule/${numericYear}/${numericMonth}/${day}`)
  }

  function handleExportIcs() {
    const ics = buildIcsCalendar(entries, { studentId })
    downloadFile(
      `schedule-${numericYear}-${String(numericMonth).padStart(2, '0')}.ics`,
      ics,
      'text/calendar;charset=utf-8'
    )
  }

  function handleExportMarkdown() {
    const markdown = buildMarkdownDocument(entries, { year: numericYear, month: numericMonth })
    downloadFile(
      `schedule-${numericYear}-${String(numericMonth).padStart(2, '0')}.md`,
      markdown,
      'text/markdown;charset=utf-8'
    )
  }

  return (
    <section>
      <h1>
        Calendar &mdash; {numericYear}-{String(numericMonth).padStart(2, '0')}
      </h1>
      <button type="button" onClick={() => goToMonth(-1)}>
        Previous month
      </button>
      <button type="button" onClick={() => goToMonth(1)}>
        Next month
      </button>
      <button type="button" onClick={handleExportIcs} disabled={isLoading || entries.length === 0}>
        Export as Calendar (.ics)
      </button>
      <button
        type="button"
        onClick={handleExportMarkdown}
        disabled={isLoading || entries.length === 0}
      >
        Export as Markdown
      </button>

      {isLoading && <p>Loading schedule...</p>}
      {error && <p role="alert">Could not load schedule: {error.message}</p>}

      <MonthGrid
        year={numericYear}
        month={numericMonth}
        entriesByDate={entriesByDate}
        onSelectDay={handleSelectDay}
      />
    </section>
  )
}
