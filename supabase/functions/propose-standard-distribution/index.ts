// Deno Edge Function — Milestone 8. Given a subject + month, proposes which
// of that month's approved standards each already-scheduled day for that
// subject should target. Reads the caller's own data (RLS-scoped via their
// forwarded JWT — never a service-role key). This function never writes to
// the database; the client saves a teacher-confirmed proposal itself as
// pending_review rows, then the teacher approves/rejects each link.
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

// Mirrors matchApprovedStandardCodesForText in
// src/features/curriculumPlan/curriculumPlanApi.js — kept as a separate
// inline copy since this runs in Deno, not the client bundle. An en-dash
// range token is intentionally left unmatched rather than auto-expanded.
function splitStandardsText(standardsText: string | null): { plainTokens: string[]; rangeTokens: string[] } {
  if (!standardsText) return { plainTokens: [], rangeTokens: [] }
  const tokens = standardsText
    .split(/[,;]/)
    .map((token) => token.trim())
    .filter(Boolean)
  return {
    plainTokens: tokens.filter((token) => !token.includes('–')),
    rangeTokens: tokens.filter((token) => token.includes('–')),
  }
}

const SYSTEM_PROMPT = `You are helping a homeschool teacher decide which of this month's already-approved state standards each already-scheduled day should target for one subject. You will be given the month's focus/standards description, a closed list of candidate standard codes with descriptions, and the exact list of scheduled dates (with schedule_entry_id) for this subject this month. Assign each day zero, one, or more standards from the candidate list only -- never invent a code or id that isn't in the candidate list. Spread coverage sensibly across the month rather than clustering everything on one day, and it is fine for some days (e.g. review/enrichment days) to get no standard at all. Every standardId you return must be copied exactly from the candidate list.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    let body: { studentId?: string; subjectId?: string; year?: number; month?: number }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { studentId, subjectId, year, month } = body
    if (!studentId || !subjectId || !year || !month) {
      return json({ error: 'studentId, subjectId, year, and month are required' }, 400)
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: curriculumEntries, error: curriculumError } = await supabase
      .from('curriculum_plan_entries')
      .select('id, focus_text, standards_text')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('year', year)
      .eq('month', month)
      .eq('status', 'approved')

    if (curriculumError) {
      console.error('curriculumError', curriculumError)
      return json({ error: 'Could not load curriculum plan' }, 500)
    }

    if (!curriculumEntries || curriculumEntries.length === 0) {
      return json({
        proposals: [],
        candidateStandards: [],
        unmatchedTokens: [],
        message: 'No approved curriculum plan entry for this subject/month yet.',
      })
    }

    const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonthDate = new Date(Date.UTC(year, month, 1))
    const firstOfNextMonth = nextMonthDate.toISOString().slice(0, 10)

    const { data: monthEntries, error: monthEntriesError } = await supabase
      .from('schedule_entries')
      .select('id, scheduled_date')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .gte('scheduled_date', firstOfMonth)
      .lt('scheduled_date', firstOfNextMonth)
      .order('scheduled_date', { ascending: true })

    if (monthEntriesError) {
      console.error('monthEntriesError', monthEntriesError)
      return json({ error: 'Could not load scheduled days' }, 500)
    }

    if (!monthEntries || monthEntries.length === 0) {
      return json({
        proposals: [],
        candidateStandards: [],
        unmatchedTokens: [],
        message: 'No scheduled days found for this subject/month. Generate the schedule first.',
      })
    }

    const plainTokenSet = new Set<string>()
    const rangeTokenSet = new Set<string>()
    let combinedFocusText = ''
    for (const entry of curriculumEntries) {
      combinedFocusText += `${entry.focus_text}\n`
      const { plainTokens, rangeTokens } = splitStandardsText(entry.standards_text)
      plainTokens.forEach((token) => plainTokenSet.add(token))
      rangeTokens.forEach((token) => rangeTokenSet.add(token))
    }

    let candidateStandards: Standard[] = []
    if (plainTokenSet.size > 0) {
      const { data: matched, error: matchedError } = await supabase
        .from('standards')
        .select('id, code, description')
        .eq('subject_id', subjectId)
        .eq('status', 'approved')
        .in('code', [...plainTokenSet])

      if (matchedError) {
        console.error('matchedError', matchedError)
        return json({ error: 'Could not match standards' }, 500)
      }
      candidateStandards = matched ?? []
    }

    const matchedCodes = new Set(candidateStandards.map((s) => s.code))
    const unmatchedTokens = [
      ...[...plainTokenSet].filter((token) => !matchedCodes.has(token)),
      ...rangeTokenSet,
    ]

    if (candidateStandards.length === 0) {
      return json({
        proposals: [],
        candidateStandards: [],
        unmatchedTokens,
        message: "No approved standards match this month's standards_text — ingest/approve them first.",
      })
    }

    const candidateList = candidateStandards
      .map((s) => `- id: ${s.id} | code: ${s.code} | ${s.description}`)
      .join('\n')
    const scheduledDatesList = monthEntries
      .map((e) => `- schedule_entry_id: ${e.id} | date: ${e.scheduled_date}`)
      .join('\n')

    const userPrompt = `Month's focus/standards description:\n${combinedFocusText}\n\nCandidate standards (closed list -- use only these ids):\n${candidateList}\n\nScheduled days for this subject this month:\n${scheduledDatesList}\n\nAssign each scheduled day zero, one, or more standardIds from the candidate list.`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                proposals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      scheduleEntryId: { type: 'string' },
                      standardIds: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['scheduleEntryId', 'standardIds'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['proposals'],
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
        proposals: [],
        candidateStandards,
        unmatchedTokens,
        message: 'The AI declined to generate a distribution for this request.',
      })
    }

    const textBlock = (anthropicData.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) {
      console.error('No text block in Anthropic response', anthropicData)
      return json({ error: 'AI response was empty' }, 502)
    }

    let parsed: { proposals?: { scheduleEntryId: string; standardIds: string[] }[] }
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      console.error('Failed to parse AI JSON', textBlock.text)
      return json({ error: 'AI response was not valid JSON' }, 502)
    }

    // Build one proposal row per real scheduled day (even if the AI omitted
    // it or proposed no standards for it) so the review UI always shows the
    // full month, never just whichever days the AI happened to mention.
    const realEntryIds = new Set(monthEntries.map((e) => e.id))
    const realStandardIds = new Set(candidateStandards.map((s) => s.id))
    const standardIdsByEntry = new Map(
      (parsed.proposals ?? [])
        .filter((p) => realEntryIds.has(p.scheduleEntryId))
        .map((p) => [p.scheduleEntryId, (p.standardIds ?? []).filter((id) => realStandardIds.has(id))])
    )
    const proposals = monthEntries.map((e) => ({
      scheduleEntryId: e.id,
      scheduledDate: e.scheduled_date,
      standardIds: standardIdsByEntry.get(e.id) ?? [],
    }))

    return json({ proposals, candidateStandards, unmatchedTokens })
  } catch (error) {
    console.error('Unexpected error', error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
