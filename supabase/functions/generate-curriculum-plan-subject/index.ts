// Deno Edge Function — Milestone 10. Given a school year, one subject, and
// the grade band(s) the teacher explicitly selected for it, generates a
// full year's curriculum plan (one entry per month with a scheduled-day
// presence for this subject) sequenced from the subject's approved
// standards alone -- no source document required. This is the teacher's
// stated "first value of this project": generating a curriculum from
// standards + the academic calendar, not just ingesting one that already
// exists (Milestone 7). Reads the caller's own data (RLS-scoped via their
// forwarded JWT -- never a service-role key). Transient: no DB writes; the
// client saves a teacher-reviewed batch itself as pending_review rows.
//
// Spike-tested 2026-07-10: a real claude-opus-4-8 call at
// output_config.effort:'high' against 15 candidate standards across 10
// months completed in ~22s, well within Supabase's Edge Function time
// limit -- no streaming response needed.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type Standard = { id: string; code: string; description: string }
type SkipRange = { start_date: string; end_date: string }
type SchoolYear = {
  id: string
  start_date: string
  end_date: string
  counts_sunday: boolean
  counts_monday: boolean
  counts_tuesday: boolean
  counts_wednesday: boolean
  counts_thursday: boolean
  counts_friday: boolean
  counts_saturday: boolean
}
type SubjectPattern = {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  start_date: string | null
  end_date: string | null
}

// --- Ported from src/features/schedule/scheduleEngine.js (pure date logic,
// no Supabase/React imports there either -- safe to duplicate verbatim for
// the Deno runtime, same precedent as propose-standard-distribution's
// inline copy of the standards-text splitting logic). ---
const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const PATTERN_KEY_BY_WEEKDAY_INDEX = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', null] as const

function toDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}
function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}
function isWithinSkipRanges(dateStr: string, skipRanges: SkipRange[]): boolean {
  return skipRanges.some((range) => dateStr >= range.start_date && dateStr <= range.end_date)
}
function getCandidateSchoolDays(schoolYear: SchoolYear, skipRanges: SkipRange[]): string[] {
  const start = toDateOnly(schoolYear.start_date)
  const end = toDateOnly(schoolYear.end_date)
  const dates: string[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const weekdayIndex = day.getUTCDay()
    const countsKey = `counts_${WEEKDAY_KEYS[weekdayIndex]}` as keyof SchoolYear
    if (!schoolYear[countsKey]) continue
    const dateStr = formatDateOnly(day)
    if (isWithinSkipRanges(dateStr, skipRanges)) continue
    dates.push(dateStr)
  }
  return dates
}

// Filters candidate school days down to the ones a specific subject's
// weekly pattern actually schedules it on -- same weekday/date-range logic
// as computeScheduleDiff in scheduleEngine.js.
function getSubjectInstructionalDays(candidateDates: string[], pattern: SubjectPattern): string[] {
  return candidateDates.filter((date) => {
    const weekdayIndex = toDateOnly(date).getUTCDay()
    const patternKey = PATTERN_KEY_BY_WEEKDAY_INDEX[weekdayIndex]
    if (!patternKey) return false
    if (!pattern[patternKey as keyof SubjectPattern]) return false
    if (pattern.start_date && date < pattern.start_date) return false
    if (pattern.end_date && date > pattern.end_date) return false
    return true
  })
}

// Mirrors matchApprovedStandardCodesForText in
// src/features/curriculumPlan/curriculumPlanApi.js -- same accepted
// limitation as Milestone 8: an en-dash range token is left unmatched
// rather than auto-expanded.
function splitStandardsText(standardsText: string | null): string[] {
  if (!standardsText) return []
  return standardsText
    .split(/[,;]/)
    .map((token) => token.trim())
    .filter((token) => token && !token.includes('–'))
}

const SYSTEM_PROMPT = `You are designing a full school-year curriculum sequence for one subject for a homeschool student, given a closed list of candidate state standards and the real number of instructional days available in each calendar month this subject meets. Produce a pedagogically sound month-by-month sequence: foundational skills before dependent ones, appropriate pacing for each month's actual day count, spiraling review where sensible. Never invent a standard id outside the candidate list, and never propose an entry for a month not in the given list of months. It is fine for a light or review month to have few or no new standards. If other subjects are also being scheduled this year, use their names only as light context for what else the student's day/week may include -- do not attempt to coordinate their pacing in detail.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    let body: {
      studentId?: string
      schoolYearId?: string
      subjectId?: string
      gradeBandIds?: string[]
      usePriorYearReuse?: boolean
      excludedMasteredStandardIds?: string[]
      otherSubjectNames?: string[]
    }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const {
      studentId,
      schoolYearId,
      subjectId,
      gradeBandIds,
      usePriorYearReuse,
      excludedMasteredStandardIds,
      otherSubjectNames,
    } = body

    if (!studentId || !schoolYearId || !subjectId || !gradeBandIds || gradeBandIds.length === 0) {
      return json({ error: 'studentId, schoolYearId, subjectId, and gradeBandIds are required' }, 400)
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: schoolYear, error: schoolYearError } = await supabase
      .from('school_years')
      .select('*')
      .eq('id', schoolYearId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (schoolYearError) {
      console.error('schoolYearError', schoolYearError)
      return json({ error: 'Could not load school year' }, 500)
    }
    if (!schoolYear) {
      return json({ error: 'School year not found' }, 404)
    }

    const { data: skipDates, error: skipDatesError } = await supabase
      .from('school_year_skip_dates')
      .select('start_date, end_date')
      .eq('school_year_id', schoolYearId)

    if (skipDatesError) {
      console.error('skipDatesError', skipDatesError)
      return json({ error: 'Could not load skip dates' }, 500)
    }

    const { data: pattern, error: patternError } = await supabase
      .from('subject_schedule_patterns')
      .select('monday, tuesday, wednesday, thursday, friday, start_date, end_date')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (patternError) {
      console.error('patternError', patternError)
      return json({ error: 'Could not load subject pattern' }, 500)
    }

    if (!pattern) {
      return json({
        entries: [],
        message: 'No weekly schedule pattern set for this subject yet. Set one up first.',
      })
    }

    const candidateDates = getCandidateSchoolDays(schoolYear as SchoolYear, (skipDates ?? []) as SkipRange[])
    const instructionalDates = getSubjectInstructionalDays(candidateDates, pattern as SubjectPattern)

    if (instructionalDates.length === 0) {
      return json({
        entries: [],
        message: 'This subject has no instructional days within the school year date range.',
      })
    }

    const daysByMonth = new Map<string, number>()
    for (const date of instructionalDates) {
      const monthKey = date.slice(0, 7)
      daysByMonth.set(monthKey, (daysByMonth.get(monthKey) ?? 0) + 1)
    }
    const monthKeys = [...daysByMonth.keys()].sort()

    const { data: candidateStandards, error: standardsError } = await supabase
      .from('standards')
      .select('id, code, description')
      .eq('subject_id', subjectId)
      .eq('status', 'approved')
      .in('grade_band_id', gradeBandIds)

    if (standardsError) {
      console.error('standardsError', standardsError)
      return json({ error: 'Could not load standards' }, 500)
    }

    if (!candidateStandards || candidateStandards.length === 0) {
      return json({
        entries: [],
        message: 'No approved standards for this subject in the selected grade band(s).',
      })
    }

    // Hard-exclude already-mastered standards -- computed deterministically
    // here, never asked of the AI (same precedent as suggest-next-day-revision's
    // coverage check). Two sources, unioned: prior-year reuse (this
    // function) and an already-teacher-confirmed list from Milestone 11's
    // assessment-document flow (passed straight through in the request).
    const masteredCodes = new Set<string>()
    if (usePriorYearReuse) {
      const { data: priorSchoolYears, error: priorSchoolYearsError } = await supabase
        .from('school_years')
        .select('id, start_date, end_date')
        .eq('student_id', studentId)
        .lt('end_date', schoolYear.start_date)
        .order('end_date', { ascending: false })
        .limit(1)

      if (priorSchoolYearsError) {
        console.error('priorSchoolYearsError', priorSchoolYearsError)
        return json({ error: 'Could not load prior school year' }, 500)
      }

      if (priorSchoolYears && priorSchoolYears.length > 0) {
        const priorYear = priorSchoolYears[0]
        const priorYearStartYear = toDateOnly(priorYear.start_date).getUTCFullYear()
        const priorYearEndYear = toDateOnly(priorYear.end_date).getUTCFullYear()

        const { data: priorEntries, error: priorEntriesError } = await supabase
          .from('curriculum_plan_entries')
          .select('standards_text')
          .eq('student_id', studentId)
          .eq('subject_id', subjectId)
          .eq('status', 'approved')
          .eq('mastery_status', 'mastered')
          .gte('year', priorYearStartYear)
          .lte('year', priorYearEndYear)

        if (priorEntriesError) {
          console.error('priorEntriesError', priorEntriesError)
          return json({ error: 'Could not load prior curriculum plan' }, 500)
        }

        for (const entry of priorEntries ?? []) {
          splitStandardsText(entry.standards_text).forEach((code) => masteredCodes.add(code))
        }
      }
    }

    const excludedIdSet = new Set(excludedMasteredStandardIds ?? [])
    const finalCandidates = (candidateStandards as Standard[]).filter(
      (s) => !masteredCodes.has(s.code) && !excludedIdSet.has(s.id)
    )
    const excludedMasteredCount = candidateStandards.length - finalCandidates.length

    if (finalCandidates.length === 0) {
      return json({
        entries: [],
        excludedMasteredCount,
        message: 'Every approved standard in this grade band is already marked mastered.',
      })
    }

    const candidateList = finalCandidates
      .map((s) => `- id: ${s.id} | code: ${s.code} | ${s.description}`)
      .join('\n')
    const monthList = monthKeys.map((key) => `- ${key}: ${daysByMonth.get(key)} instructional day(s)`).join('\n')
    const otherSubjectsLine =
      otherSubjectNames && otherSubjectNames.length > 0
        ? `Other subjects also being scheduled this year: ${otherSubjectNames.join(', ')}.`
        : ''

    const userPrompt = `Candidate standards (closed list -- use only these ids):\n${candidateList}\n\nMonths this subject meets, with real instructional day counts (use only these year-month values):\n${monthList}\n\n${otherSubjectsLine}\n\nProduce one entry per month listed above.`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: {
          effort: 'high',
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                entries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      yearMonth: { type: 'string' },
                      focusText: { type: 'string' },
                      standardsText: { type: ['string', 'null'] },
                      standardIds: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['yearMonth', 'focusText', 'standardsText', 'standardIds'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['entries'],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      console.error('Anthropic API error', anthropicResponse.status, errText)
      return json({ error: 'AI request failed' }, 502)
    }

    const anthropicData = await anthropicResponse.json()

    if (anthropicData.stop_reason === 'refusal') {
      return json({
        entries: [],
        excludedMasteredCount,
        message: 'The AI declined to generate a curriculum for this subject.',
      })
    }

    const textBlock = (anthropicData.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) {
      console.error('No text block in Anthropic response', anthropicData)
      return json({ error: 'AI response was empty' }, 502)
    }

    let parsed: {
      entries?: { yearMonth: string; focusText: string; standardsText: string | null; standardIds: string[] }[]
    }
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      console.error('Failed to parse AI JSON', textBlock.text)
      return json({ error: 'AI response was not valid JSON' }, 502)
    }

    // Defensive filtering: only real months from this subject's actual
    // instructional calendar, only standard ids from the closed candidate
    // set, mirroring every other function in this app.
    const realMonthSet = new Set(monthKeys)
    const realStandardIds = new Set(finalCandidates.map((s) => s.id))
    const usedStandardIds = new Set<string>()

    const entries = (parsed.entries ?? [])
      .filter((e) => realMonthSet.has(e.yearMonth))
      .map((e) => {
        const [yearStr, monthStr] = e.yearMonth.split('-')
        const standardIds = (e.standardIds ?? []).filter((id) => realStandardIds.has(id))
        standardIds.forEach((id) => usedStandardIds.add(id))
        return {
          year: Number(yearStr),
          month: Number(monthStr),
          focusText: e.focusText,
          standardsText: e.standardsText,
          standardIds,
        }
      })

    const unusedStandardIds = finalCandidates.map((s) => s.id).filter((id) => !usedStandardIds.has(id))

    const instructionalDaysByMonth = Object.fromEntries(daysByMonth)
    return json({ entries, unusedStandardIds, excludedMasteredCount, instructionalDaysByMonth })
  } catch (error) {
    console.error('Unexpected error', error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
