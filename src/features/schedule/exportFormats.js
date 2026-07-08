// Pure formatting functions: no Supabase/React imports, so these can be
// reasoned about (and unit-tested) in isolation, mirroring scheduleEngine.js.

function groupEntriesByDate(entries) {
  const map = new Map()
  for (const entry of entries) {
    const list = map.get(entry.scheduled_date) ?? []
    list.push(entry)
    map.set(entry.scheduled_date, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) =>
      (a.subjects?.name ?? 'Subject').localeCompare(b.subjects?.name ?? 'Subject')
    )
  }
  return map
}

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n/g, '\\n')
}

function formatIcsDate(dateStr) {
  return dateStr.replace(/-/g, '')
}

function addOneDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function formatDtstamp(now) {
  return `${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

export function buildIcsCalendar(entries, { studentId, now = new Date() } = {}) {
  const grouped = groupEntriesByDate(entries)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SchoolDailyScheduler//Export//EN',
    'CALSCALE:GREGORIAN',
  ]

  for (const [dateStr, dayEntries] of grouped) {
    const subjectNames = dayEntries.map((entry) => entry.subjects?.name ?? 'Subject')
    const dayNumber = dayEntries.find((entry) => entry.day_number)?.day_number
    const summary = dayNumber
      ? `Day ${dayNumber}: ${subjectNames.join(', ')}`
      : `School day: ${subjectNames.join(', ')}`

    const descriptionLines = dayEntries.map((entry) => {
      const name = entry.subjects?.name ?? 'Subject'
      const plan = entry.activity_plan?.trim() || 'No activity plan set'
      return `${name} (${entry.status}): ${plan}`
    })

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${dateStr}-${studentId ?? 'student'}@schooldailyscheduler`)
    lines.push(`DTSTAMP:${formatDtstamp(now)}`)
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(dateStr)}`)
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(addOneDay(dateStr))}`)
    lines.push(`SUMMARY:${escapeIcsText(summary)}`)
    lines.push(`DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function buildMarkdownDocument(entries, { year, month }) {
  const grouped = groupEntriesByDate(entries)
  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  const sections = [`# Schedule — ${monthName} ${year}`]

  for (const [dateStr, dayEntries] of grouped) {
    const dayNumber = dayEntries.find((entry) => entry.day_number)?.day_number
    const heading = dayNumber ? `## Day ${dayNumber} — ${dateStr}` : `## ${dateStr}`
    const items = dayEntries.map((entry) => {
      const name = entry.subjects?.name ?? 'Subject'
      const plan = entry.activity_plan?.trim() || '_No activity plan set_'
      return `- **${name}**: ${plan}`
    })
    sections.push(`${heading}\n\n${items.join('\n')}`)
  }

  return sections.join('\n\n')
}
