// Deno Edge Function — Deno is TS-native, so this is the one TS file in an
// otherwise-JS project. Not an inconsistency, just the right tool here.
//
// Reads the caller's own data (RLS-scoped via their forwarded JWT — never a
// service-role key), asks Claude for short next-day activity suggestions
// based on the prior school day's progress notes, and returns them. This
// function never writes to the database; the client saves accepted
// suggestions itself via a normal RLS-scoped update.
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

const SYSTEM_PROMPT = `You are an assistant to a homeschool teacher. Based on the student's progress notes from their previous school day, suggest a short, concrete activity for each subject scheduled today. Keep each suggestion to 1-3 sentences, actionable, and appropriate for the subject and any noted learning style or interests. If no notes are available for a subject, suggest a reasonable default activity based on the subject name alone. Do not invent subjects other than the ones listed.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    let body: { studentId?: string; targetDate?: string }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { studentId, targetDate } = body
    if (!studentId || !targetDate) {
      return json({ error: 'studentId and targetDate are required' }, 400)
    }

    // Request-scoped client: every query below runs AS the calling user via
    // RLS, exactly like a client-side call. No service-role key anywhere.
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: todayEntries, error: todayError } = await supabase
      .from('schedule_entries')
      .select('id, subject_id, subjects(name)')
      .eq('student_id', studentId)
      .eq('scheduled_date', targetDate)

    if (todayError) {
      console.error('todayError', todayError)
      return json({ error: "Could not load today's schedule" }, 500)
    }

    if (!todayEntries || todayEntries.length === 0) {
      return json({
        suggestions: [],
        sourceDate: null,
        message: 'No subjects scheduled for this day.',
      })
    }

    const { data: priorDayRows, error: priorDayError } = await supabase
      .from('schedule_entries')
      .select('scheduled_date')
      .eq('student_id', studentId)
      .lt('scheduled_date', targetDate)
      .order('scheduled_date', { ascending: false })
      .limit(1)

    if (priorDayError) {
      console.error('priorDayError', priorDayError)
      return json({ error: 'Could not load prior schedule' }, 500)
    }

    const sourceDate = priorDayRows && priorDayRows.length > 0 ? priorDayRows[0].scheduled_date : null

    const notesBySubject = new Map<string, Record<string, unknown>>()
    if (sourceDate) {
      const { data: priorEntries, error: priorEntriesError } = await supabase
        .from('schedule_entries')
        .select('id, subject_id, subjects(name)')
        .eq('student_id', studentId)
        .eq('scheduled_date', sourceDate)

      if (priorEntriesError) {
        console.error('priorEntriesError', priorEntriesError)
        return json({ error: 'Could not load prior day details' }, 500)
      }

      const priorEntryIds = (priorEntries ?? []).map((e: { id: string }) => e.id)
      if (priorEntryIds.length > 0) {
        const { data: notes, error: notesError } = await supabase
          .from('progress_entries')
          .select('*')
          .in('schedule_entry_id', priorEntryIds)

        if (notesError) {
          console.error('notesError', notesError)
          return json({ error: 'Could not load prior progress notes' }, 500)
        }

        const entryById = new Map((priorEntries ?? []).map((e: { id: string }) => [e.id, e]))
        for (const note of notes ?? []) {
          const entry = entryById.get(note.schedule_entry_id) as
            | { subjects?: { name?: string } }
            | undefined
          const subjectName = entry?.subjects?.name ?? 'Unknown subject'
          notesBySubject.set(subjectName, note)
        }
      }
    }

    const notesSections: string[] = []
    if (sourceDate) {
      const subjectNamesToday = new Set(
        todayEntries.map((e: { subjects?: { name?: string } }) => e.subjects?.name).filter(Boolean)
      )
      for (const subjectName of subjectNamesToday) {
        const note = notesBySubject.get(subjectName as string)
        if (!note) {
          notesSections.push(`Subject: ${subjectName}\n- No notes recorded for this subject.`)
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
    }

    const notesBlock = sourceDate
      ? `Progress notes from ${sourceDate} (previous school day):\n\n${notesSections.join('\n\n')}`
      : 'No progress notes are available from a previous school day (this may be the first scheduled day).'

    const todaySubjectsList = todayEntries
      .map((e: { id: string; subjects?: { name?: string } }) => `- ${e.subjects?.name ?? 'Subject'} (schedule_entry_id: ${e.id})`)
      .join('\n')

    const userPrompt = `${notesBlock}\n\nToday (${targetDate}) has the following subjects scheduled:\n${todaySubjectsList}\n\nFor each subject scheduled today, suggest one short activity. Return exactly one suggestion per schedule_entry_id listed above.`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      scheduleEntryId: { type: 'string' },
                      suggestedActivity: { type: 'string' },
                    },
                    required: ['scheduleEntryId', 'suggestedActivity'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['suggestions'],
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
        suggestions: [],
        sourceDate,
        message: 'The AI declined to generate suggestions for this request.',
      })
    }

    const textBlock = (anthropicData.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) {
      console.error('No text block in Anthropic response', anthropicData)
      return json({ error: 'AI response was empty' }, 502)
    }

    let parsed: { suggestions?: { scheduleEntryId: string; suggestedActivity: string }[] }
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      console.error('Failed to parse AI JSON', textBlock.text)
      return json({ error: 'AI response was not valid JSON' }, 502)
    }

    const todayEntryIds = new Set(todayEntries.map((e: { id: string }) => e.id))
    const suggestions = (parsed.suggestions ?? []).filter((s) => todayEntryIds.has(s.scheduleEntryId))

    return json({ suggestions, sourceDate })
  } catch (error) {
    console.error('Unexpected error', error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
