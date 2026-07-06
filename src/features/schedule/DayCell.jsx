export function DayCell({ date, dateStr, isCurrentMonth, entries, onSelect }) {
  const dayNumber = date.getUTCDate()
  const visibleEntries = entries.slice(0, 3)
  const overflowCount = entries.length - visibleEntries.length

  return (
    <td
      className={isCurrentMonth ? 'day-cell' : 'day-cell day-cell-outside'}
      onClick={() => onSelect(dateStr)}
    >
      <div className="day-number">{dayNumber}</div>
      <ul className="day-chips">
        {visibleEntries.map((entry) => (
          <li key={entry.id} className={`chip chip-${entry.status}`}>
            {entry.subjects?.name ?? 'Subject'}
          </li>
        ))}
        {overflowCount > 0 && <li>+{overflowCount} more</li>}
      </ul>
    </td>
  )
}
