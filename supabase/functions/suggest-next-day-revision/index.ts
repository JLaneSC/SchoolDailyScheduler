// Deno Edge Function — Milestone 9. Given the day currently being viewed
// (sourceDate) and its freshly-entered progress notes, proposes a revision
// for the NEXT scheduled school day, then checks -- deterministically, via
// a direct query, never by asking the AI -- whether accepting the proposal
// would drop a standard that isn't covered by any other scheduled day this
// school year (past or future). Reads the caller's own data (RLS-scoped via
// their forwarded JWT -- never a service-role key). This function never
// writes to the database; the client applies the teacher's chosen option
// (AI's replacement / original as-is / blend) itself.
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

const SYSTEM_PROMPT = `You are revising a homeschool student's plan for the next scheduled school day, using the previous school day's progress notes. For each subject scheduled on the target day WHERE THE NOTES CALL FOR A REAL CHANGE, propose two things: (1) a revised activity plan that addresses the notes (skills to reinforce, high-interest topics, learning style, behavior/attention patterns) while still working toward completing the ORIGINAL planned activity for that day -- adapt how it's approached, don't abandon the goal; and (2) a blended activity plan that does the same but ALSO explicitly keeps working toward every standard currently assigned to this day (do not drop any of them) -- it should read as one coherent day's activity, not two activities stapled together. Match the exact structure/format already present in that day's current activity plan text for both; do not invent a new template. Use short, instructional formatting (numbered steps, a brief example or question per activity) over narrative prose. Also state which of the given candidate standards (a closed list per subject) the revised plan would target -- pick only from that list, or return none if unclear. Only include a subject in your response if you are actually proposing a change; omit subjects where nothing needs to change based on the notes.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    let body: { studentId?: string; sourceDate?: string }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { studentId, sourceDate } = body
    if (!studentId || !sourceDate) {
      return json({ error: 'studentId and sourceDate are required' }, 400)
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: targetDayRows, error: targetDayError } = await supabase
      .from('schedule_entries')
      .select('scheduled_date')
      .eq('student_id', studentId)
      .gt('scheduled_date', sourceDate)
      .order('scheduled_date', { ascending: true })
      .limit(1)

    if (targetDayError) {
      console.error('targetDayError', targetDayError)
      return json({ error: 'Could not find next scheduled day' }, 500)
    }

    if (!targetDayRows || targetDayRows.length === 0) {
      return json({ targetDate: null, entries: [], message: 'No further scheduled day found.' })
    }

    const targetDate = targetDayRows[0].scheduled_date

    // Source day entries + progress notes (same shape suggest-daily-activities
    // already loads, just for a directly-known date rather than a lookup).
    const { data: sourceEntries, error: sourceEntriesError } = await supabase
      .from('schedule_entries')
      .select('id, subject_id, subjects(name)')
      .eq('student_id', studentId)
      .eq('scheduled_date', sourceDate)

    if (sourceEntriesError) {
      console.error('sourceEntriesError', sourceEntriesError)
      return json({ error: "Could not load today's schedule" }, 500)
    }

    const sourceEntryIds = (sourceEntries ?? []).map((e: { id: string }) => e.id)
    const notesBySubject = new Map<string, Record<string, unknown>>()
    if (sourceEntryIds.length > 0) {
      const { data: notes, error: notesError } = await supabase
        .from('progress_entries')
        .select('*')
        .in('schedule_entry_id', sourceEntryIds)

      if (notesError) {
        console.error('notesError', notesError)
        return json({ error: "Could not load today's progress notes" }, 500)
      }

      const entryById = new Map((sourceEntries ?? []).map((e: { id: string }) => [e.id, e]))
      for (const note of notes ?? []) {
        const entry = entryById.get(note.schedule_entry_id) as
          | { subjects?: { name?: string } }
          | undefined
        const subjectName = entry?.subjects?.name ?? 'Unknown subject'
        notesBySubject.set(subjectName, note)
      }
    }

    // Target day entries -- what's actually being revised.
    const { data: targetEntries, error: targetEntriesError } = await supabase
      .from('schedule_entries')
      .select('id, subject_id, activity_plan, subjects(name)')
      .eq('student_id', studentId)
      .eq('scheduled_date', targetDate)

    if (targetEntriesError) {
      console.error('targetEntriesError', targetEntriesError)
      return json({ error: "Could not load tomorrow's schedule" }, 500)
    }

    if (!targetEntries || targetEntries.length === 0) {
      return json({ targetDate, entries: [], message: 'No subjects scheduled that day.' })
    }

    const targetEntryIds = targetEntries.map((e: { id: string }) => e.id)

    // Current approved standard links per target entry.
    const { data: currentLinks, error: currentLinksError } = await supabase
      .from('schedule_entry_standards')
      .select('schedule_entry_id, standards(id, code, description)')
      .eq('status', 'approved')
      .in('schedule_entry_id', targetEntryIds)

    if (currentLinksError) {
      console.error('currentLinksError', currentLinksError)
      return json({ error: 'Could not load current standard links' }, 500)
    }

    const currentStandardsByEntry = new Map<string, Standard[]>()
    for (const link of currentLinks ?? []) {
      const list = currentStandardsByEntry.get(link.schedule_entry_id) ?? []
      list.push(link.standards as unknown as Standard)
      currentStandardsByEntry.set(link.schedule_entry_id, list)
    }

    // Closed candidate set per subject present on the target day: that
    // subject's full approved-standards list, for anything newly proposed.
    const subjectIds = [...new Set(targetEntries.map((e: { subject_id: string }) => e.subject_id))]
    const { data: subjectStandards, error: subjectStandardsError } = await supabase
      .from('standards')
      .select('id, code, description, subject_id')
      .in('subject_id', subjectIds)
      .eq('status', 'approved')

    if (subjectStandardsError) {
      console.error('subjectStandardsError', subjectStandardsError)
      return json({ error: 'Could not load candidate standards' }, 500)
    }

    const candidatesBySubject = new Map<string, Standard[]>()
    for (const standard of subjectStandards ?? []) {
      const list = candidatesBySubject.get(standard.subject_id) ?? []
      list.push({ id: standard.id, code: standard.code, description: standard.description })
      candidatesBySubject.set(standard.subject_id, list)
    }

    // Build the prompt.
    const notesSections: string[] = []
    for (const entry of targetEntries as { subjects?: { name?: string } }[]) {
      const subjectName = entry.subjects?.name ?? 'Subject'
      const note = notesBySubject.get(subjectName)
      if (!note) {
        notesSections.push(`Subject: ${subjectName}\n- No notes recorded for this subject today.`)
        continue
      }
      const fields: string[] = []
      if (note.skills_mastered) fields.push(`- Skills mastered: ${note.skills_mastered}`)
      if (note.concepts_to_reinforce) fields.push(`- Concepts to reinforce: ${note.concepts_to_reinforce}`)
      if (note.high_interest_topics) fields.push(`- High-interest topics: ${note.high_interest_topics}`)
      if (note.learning_style_notes) fields.push(`- Learning style notes: ${note.learning_style_notes}`)
      if (note.behavior_attention_notes)
        fields.push(`- Behavior/attention notes: ${note.behavior_attention_notes}`)
      notesSections.push(
        `Subject: ${subjectName}\n${fields.length > 0 ? fields.join('\n') : '- No structured notes recorded.'}`
      )
    }

    const targetDaySections = (targetEntries as {
      id: string
      subject_id: string
      activity_plan: string | null
      subjects?: { name?: string }
    }[])
      .map((entry) => {
        const candidates = candidatesBySubject.get(entry.subject_id) ?? []
        const candidateList = candidates.map((s) => `  - id: ${s.id} | code: ${s.code} | ${s.description}`).join('\n')
        return `schedule_entry_id: ${entry.id}\nSubject: ${entry.subjects?.name ?? 'Subject'}\nCurrent activity plan: ${entry.activity_plan ?? '(none set)'}\nCandidate standards for this subject:\n${candidateList || '  (none)'}`
      })
      .join('\n\n')

    const userPrompt = `Progress notes from ${sourceDate} (previous school day):\n\n${notesSections.join('\n\n')}\n\nTarget day (${targetDate}) currently has:\n\n${targetDaySections}\n\nFor each subject where the notes call for a real change, return a revision.`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                revisions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      scheduleEntryId: { type: 'string' },
                      revisedActivityPlan: { type: 'string' },
                      revisedStandardIds: { type: 'array', items: { type: 'string' } },
                      blendedActivityPlan: { type: 'string' },
                    },
                    required: [
                      'scheduleEntryId',
                      'revisedActivityPlan',
                      'revisedStandardIds',
                      'blendedActivityPlan',
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ['revisions'],
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
        targetDate,
        entries: [],
        message: 'The AI declined to generate a revision for this request.',
      })
    }

    const textBlock = (anthropicData.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) {
      console.error('No text block in Anthropic response', anthropicData)
      return json({ error: 'AI response was empty' }, 502)
    }

    let parsed: {
      revisions?: {
        scheduleEntryId: string
        revisedActivityPlan: string
        revisedStandardIds: string[]
        blendedActivityPlan: string
      }[]
    }
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      console.error('Failed to parse AI JSON', textBlock.text)
      return json({ error: 'AI response was not valid JSON' }, 502)
    }

    const targetEntryById = new Map(
      (targetEntries as { id: string; subject_id: string; subjects?: { name?: string } }[]).map((e) => [e.id, e])
    )

    // Defensive filtering: only real target entries, only candidate
    // standards for that entry's actual subject.
    const revisions = (parsed.revisions ?? []).filter((r) => targetEntryById.has(r.scheduleEntryId))
    for (const r of revisions) {
      const entry = targetEntryById.get(r.scheduleEntryId)!
      const validIds = new Set((candidatesBySubject.get(entry.subject_id) ?? []).map((s) => s.id))
      r.revisedStandardIds = (r.revisedStandardIds ?? []).filter((id) => validIds.has(id))
    }

    // Active school year for the target date -- bounds "the yearly calendar"
    // for the coverage check.
    const { data: schoolYearRows, error: schoolYearError } = await supabase
      .from('school_years')
      .select('start_date, end_date')
      .eq('student_id', studentId)
      .lte('start_date', targetDate)
      .gte('end_date', targetDate)
      .limit(1)

    if (schoolYearError) {
      console.error('schoolYearError', schoolYearError)
      return json({ error: 'Could not load school year' }, 500)
    }

    const schoolYear = schoolYearRows && schoolYearRows.length > 0 ? schoolYearRows[0] : null

    // Deterministic coverage check -- computed here via a direct query,
    // never by the AI. A dropped standard is "lost" only if no OTHER
    // scheduled day for the same student+subject, anywhere in the school
    // year (past or future), also has it approved.
    const entries = []
    for (const r of revisions) {
      const entry = targetEntryById.get(r.scheduleEntryId)!
      const currentStandards = currentStandardsByEntry.get(r.scheduleEntryId) ?? []
      const revisedIdSet = new Set(r.revisedStandardIds)
      const droppedStandards = currentStandards.filter((s) => !revisedIdSet.has(s.id))

      const lostStandards: Standard[] = []
      if (droppedStandards.length > 0 && schoolYear) {
        for (const dropped of droppedStandards) {
          const { data: coverageRows, error: coverageError } = await supabase
            .from('schedule_entry_standards')
            .select('schedule_entry_id, schedule_entries!inner(scheduled_date, student_id, subject_id)')
            .eq('status', 'approved')
            .eq('standard_id', dropped.id)
            .neq('schedule_entry_id', r.scheduleEntryId)
            .eq('schedule_entries.student_id', studentId)
            .eq('schedule_entries.subject_id', entry.subject_id)
            .gte('schedule_entries.scheduled_date', schoolYear.start_date)
            .lte('schedule_entries.scheduled_date', schoolYear.end_date)
            .limit(1)

          if (coverageError) {
            console.error('coverageError', coverageError)
            return json({ error: 'Could not run coverage check' }, 500)
          }

          if (!coverageRows || coverageRows.length === 0) {
            lostStandards.push(dropped)
          }
        }
      } else if (droppedStandards.length > 0 && !schoolYear) {
        // No school year found for this date -- can't bound "the yearly
        // calendar," so conservatively treat every dropped standard as at
        // risk rather than silently allowing a loss.
        lostStandards.push(...droppedStandards)
      }

      // Enrich id lists with code/description (from the closed candidate
      // set already loaded) so the client never has to display a bare
      // uuid — consistent with currentStandards/lostStandards.
      const candidates = candidatesBySubject.get(entry.subject_id) ?? []
      const candidateById = new Map(candidates.map((s) => [s.id, s]))
      const proposedStandards = r.revisedStandardIds
        .map((id) => candidateById.get(id))
        .filter((s): s is Standard => Boolean(s))
      const blendedIdSet = new Set([...currentStandards.map((s) => s.id), ...r.revisedStandardIds])
      const blendedStandards = [...blendedIdSet].map(
        (id) => candidateById.get(id) ?? currentStandards.find((s) => s.id === id)
      ).filter((s): s is Standard => Boolean(s))

      entries.push({
        scheduleEntryId: r.scheduleEntryId,
        subjectName: entry.subjects?.name ?? 'Subject',
        currentActivityPlan: (entry as { activity_plan?: string }).activity_plan ?? null,
        currentStandards,
        proposedActivityPlan: r.revisedActivityPlan,
        proposedStandards,
        blendedActivityPlan: r.blendedActivityPlan,
        blendedStandards,
        lostStandards,
      })
    }

    return json({ targetDate, entries })
  } catch (error) {
    console.error('Unexpected error', error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
