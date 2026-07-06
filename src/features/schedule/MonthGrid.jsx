import { DayCell } from './DayCell'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function getMonthGridDays(year, month) {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const gridStart = new Date(firstOfMonth)
  gridStart.setUTCDate(gridStart.getUTCDate() - firstOfMonth.getUTCDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setUTCDate(gridStart.getUTCDate() + index)
    return date
  })
}

export function MonthGrid({ year, month, entriesByDate, onSelectDay }) {
  const days = getMonthGridDays(year, month)

  return (
    <table>
      <thead>
        <tr>
          {WEEKDAY_LABELS.map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }, (_, week) => (
          <tr key={week}>
            {days.slice(week * 7, week * 7 + 7).map((date) => {
              const dateStr = formatDateOnly(date)
              const isCurrentMonth = date.getUTCMonth() + 1 === month
              return (
                <DayCell
                  key={dateStr}
                  date={date}
                  dateStr={dateStr}
                  isCurrentMonth={isCurrentMonth}
                  entries={entriesByDate.get(dateStr) ?? []}
                  onSelect={onSelectDay}
                />
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
