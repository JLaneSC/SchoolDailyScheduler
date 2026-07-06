// Pure date/scheduling logic: no Supabase or React imports, so this can be
// reasoned about (and unit-tested) in isolation from the UI/data layer.

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

// subject_schedule_patterns only has monday..friday columns (subjects are
// assigned 1-5x/week, weekdays only) — a school year that opts into counting
// Saturday/Sunday as school days (via counts_saturday/counts_sunday) still
// consumes a day_number slot on those dates, it just never gets any subject
// entries, since there's no weekend pattern to match against.
const PATTERN_KEY_BY_WEEKDAY_INDEX = [
  null,
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  null,
]

function toDateOnly(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function isWithinSkipRanges(dateStr, skipRanges) {
  return skipRanges.some(
    (range) => dateStr >= range.start_date && dateStr <= range.end_date
  )
}

export function getCandidateSchoolDays(schoolYear, skipRanges = []) {
  const start = toDateOnly(schoolYear.start_date)
  const end = toDateOnly(schoolYear.end_date)
  const dates = []

  for (let day = start; day <= end; day = addDays(day, 1)) {
    const weekdayIndex = day.getUTCDay()
    const countsKey = `counts_${WEEKDAY_KEYS[weekdayIndex]}`
    if (!schoolYear[countsKey]) continue

    const dateStr = formatDateOnly(day)
    if (isWithinSkipRanges(dateStr, skipRanges)) continue

    dates.push(dateStr)
  }

  return dates
}

export function getRawCandidateCount(schoolYear) {
  return getCandidateSchoolDays(schoolYear, []).length
}

export function checkShortfall(schoolYear, skipRanges = []) {
  const rawAvailable = getRawCandidateCount(schoolYear)
  const effectiveAvailable = getCandidateSchoolDays(schoolYear, skipRanges).length

  return {
    rawAvailable,
    effectiveAvailable,
    rawShortfall: Math.max(0, schoolYear.target_days - rawAvailable),
    effectiveShortfall: Math.max(0, schoolYear.target_days - effectiveAvailable),
  }
}

// Diffs the schedule this school year/pattern configuration implies against
// what already exists in schedule_entries. Returns { blocked: true, ... } and
// writes nothing if the date range (after skips) can't fit target_days.
// Never proposes deleting an entry that's no longer 'planned' or that has a
// linked progress entry, even if its date falls outside the new schedule.
export function computeScheduleDiff({
  schoolYear,
  skipRanges = [],
  subjectPatterns = [],
  existingEntries = [],
}) {
  const shortfall = checkShortfall(schoolYear, skipRanges)
  if (shortfall.effectiveShortfall > 0) {
    return { blocked: true, ...shortfall }
  }

  const candidateDates = getCandidateSchoolDays(schoolYear, skipRanges).slice(
    0,
    schoolYear.target_days
  )
  const dayNumberByDate = new Map(
    candidateDates.map((date, index) => [date, index + 1])
  )

  const expected = new Map()
  for (const date of candidateDates) {
    const weekdayIndex = toDateOnly(date).getUTCDay()
    const patternKey = PATTERN_KEY_BY_WEEKDAY_INDEX[weekdayIndex]
    if (!patternKey) continue

    for (const pattern of subjectPatterns) {
      if (!pattern[patternKey]) continue
      if (pattern.start_date && date < pattern.start_date) continue
      if (pattern.end_date && date > pattern.end_date) continue

      expected.set(`${date}|${pattern.subject_id}`, dayNumberByDate.get(date))
    }
  }

  const existingByKey = new Map(
    existingEntries.map((entry) => [`${entry.scheduled_date}|${entry.subject_id}`, entry])
  )
  const isProtected = (entry) => entry.status !== 'planned' || entry.hasProgressNote

  const toInsert = []
  const toUpdateDayNumber = []
  const toDelete = []

  for (const [key, dayNumber] of expected) {
    const existing = existingByKey.get(key)
    if (!existing) {
      const [scheduledDate, subjectId] = key.split('|')
      toInsert.push({
        scheduled_date: scheduledDate,
        subject_id: subjectId,
        day_number: dayNumber,
        student_id: schoolYear.student_id,
        school_year_id: schoolYear.id,
        status: 'planned',
      })
    } else if (existing.day_number !== dayNumber) {
      toUpdateDayNumber.push({ id: existing.id, day_number: dayNumber })
    }
  }

  for (const entry of existingEntries) {
    const key = `${entry.scheduled_date}|${entry.subject_id}`
    if (!expected.has(key) && !isProtected(entry)) {
      toDelete.push(entry.id)
    }
  }

  return { blocked: false, toInsert, toUpdateDayNumber, toDelete, ...shortfall }
}
