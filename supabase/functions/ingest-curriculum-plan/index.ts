// Deno Edge Function — Deno is TS-native (see suggest-daily-activities and
// ingest-standards-document for the same convention in this project).
//
// Reads the caller's own data (RLS-scoped via their forwarded JWT — never a
// service-role key), unzips an uploaded .docx curriculum plan (Claude's
// native document input only supports PDF, not .docx — see the B0 smoke
// test that confirmed jsr:@zip-js/zip-js works in this runtime), slices out
// just the requested month's Subject/Focus/Standards table, and asks Claude
// to extract it as structured JSON grounded in that exact text. This
// function never writes to the database — the client inserts extracted
// rows as 'pending_review', matching Milestone 6's ingest-standards-document
// pattern exactly.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { BlobReader, TextWriter, ZipReader } from 'jsr:@zip-js/zip-js'

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

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
}

async function extractPlainTextFromDocx(docxBase64: string) {
  const bytes = Uint8Array.from(atob(docxBase64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes])

  const zipReader = new ZipReader(new BlobReader(blob))
  const entries = await zipReader.getEntries()
  const docEntry = entries.find((entry) => entry.filename === 'word/document.xml')

  if (!docEntry || !docEntry.getData) {
    await zipReader.close()
    return null
  }

  const xml = await docEntry.getData(new TextWriter())
  await zipReader.close()

  const withRows = xml
    .replace(/<\/w:tc>/g, ' | ')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')

  return decodeEntities(withRows)
}

// Bounds a month's section between its own heading and whichever comes
// first: the next month's heading, the "ASSESSMENT SCHEDULE" section, or
// end of text. Headings are matched only at the START of a line
// (paragraph) — inline mastery-note mentions like "confirmed May 2026"
// never start a line (they sit mid-row after a subject/focus cell), so
// this reliably distinguishes real section headings from date mentions
// scattered through the mastery prose.
function sliceMonthSection(fullText: string, year: number, month: number) {
  const themesIdx = fullText.indexOf('MONTHLY FOCUS THEMES')
  if (themesIdx === -1) return { error: 'monthly_focus_themes_not_found' as const }

  const themesText = fullText.slice(themesIdx)
  const headingRegex = new RegExp(
    `^(${MONTH_NAMES.join('|')})\\s+(\\d{4})\\b`,
    'gm'
  )
  const matches = [...themesText.matchAll(headingRegex)]

  const monthName = MONTH_NAMES[month - 1]
  const targetIndex = matches.findIndex(
    (m) => m[1] === monthName && Number(m[2]) === year
  )
  if (targetIndex === -1) return { error: 'month_heading_not_found' as const }

  const start = matches[targetIndex].index ?? 0
  const assessmentIdx = themesText.indexOf('ASSESSMENT SCHEDULE')

  const candidateEnds = [
    targetIndex + 1 < matches.length ? matches[targetIndex + 1].index : undefined,
    assessmentIdx > start ? assessmentIdx : undefined,
  ].filter((v): v is number => v !== undefined)

  const end = candidateEnds.length > 0 ? Math.min(...candidateEnds) : themesText.length

  return { text: themesText.slice(start, end).trim() }
}

const SYSTEM_PROMPT = `You are extracting a homeschool curriculum plan from an attached excerpt of a planning document, covering one specific month. Extract every row from any table whose columns are Subject, Focus, and Standards. For each row: resolve the real subject taught — if the row's subject column says "ENRICHMENT" but the Focus text names the actual subject (e.g. "PE", "Music", "CS", "Health", "Handwriting"), use that real subject name; never return "ENRICHMENT" as a subject. If a cell names two subjects together, use the first-named subject and keep the full original text in focusText — do not split it into two rows. Preserve the Standards column exactly as written, including multiple codes, ranges (e.g. "3.NR.2.1-2.6"), and semicolon/comma-separated lists — never expand a range into individual codes, never invent a code that isn't in the text. Classify masteryStatus from the Focus text using these rules: "mastered" if the text says MASTERED; "developing" if it states a percentage without MASTERED, or says Developing, or describes a mixed/uncertain history; "planned" if the text is forward-looking with no current status (mentions like "targeted", "carry-forward", "introduction", "first application"); otherwise "not_assessed". Only set masteryPercentage when a literal percentage number appears in the text — never estimate or invent one. Every value you return must come directly from the attached text — never infer content that isn't there. If nothing matches, return an empty "entries" array.`

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
      docxBase64?: string
      studentId?: string
      year?: number
      month?: number
      sourceFilename?: string
    }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { docxBase64, studentId, year, month, sourceFilename } = body
    if (!docxBase64 || !studentId || !year || !month || !sourceFilename) {
      return json(
        { error: 'docxBase64, studentId, year, month, and sourceFilename are required' },
        400
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: studentRow, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .maybeSingle()

    if (studentError) {
      console.error('studentError', studentError)
      return json({ error: 'Could not verify student' }, 500)
    }
    if (!studentRow) {
      return json({ error: 'Student not found' }, 400)
    }

    const fullText = await extractPlainTextFromDocx(docxBase64)
    if (fullText === null) {
      return json(
        { error: 'word/document.xml not found — is this a valid .docx file?' },
        422
      )
    }

    const sliceResult = sliceMonthSection(fullText, year, month)
    if ('error' in sliceResult) {
      const message =
        sliceResult.error === 'monthly_focus_themes_not_found'
          ? 'Could not find a "MONTHLY FOCUS THEMES" section in this document.'
          : `Could not find a heading for ${MONTH_NAMES[month - 1]} ${year} in this document.`
      return json({ error: message }, 422)
    }

    const userPrompt = `Source file: ${sourceFilename}\nMonth: ${MONTH_NAMES[month - 1]} ${year}\n\n${sliceResult.text}`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 8000,
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
                      subject: { type: 'string' },
                      focusText: { type: 'string' },
                      standardsText: { type: ['string', 'null'] },
                      masteryStatus: {
                        type: 'string',
                        enum: ['mastered', 'developing', 'not_assessed', 'planned'],
                      },
                      masteryPercentage: { type: ['integer', 'null'] },
                    },
                    required: [
                      'subject',
                      'focusText',
                      'standardsText',
                      'masteryStatus',
                      'masteryPercentage',
                    ],
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
        year,
        month,
        sourceFilename,
        message: 'The AI declined to process this document.',
      })
    }

    if (anthropicData.stop_reason === 'max_tokens') {
      return json(
        { error: 'Response was truncated — this month may have an unusually large table.' },
        502
      )
    }

    const textBlock = (anthropicData.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) {
      console.error('No text block in Anthropic response', anthropicData)
      return json({ error: 'AI response was empty' }, 502)
    }

    let parsed: { entries?: unknown[] }
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      console.error('Failed to parse AI JSON', textBlock.text)
      return json({ error: 'AI response was not valid JSON' }, 502)
    }

    return json({
      entries: parsed.entries ?? [],
      year,
      month,
      sourceFilename,
    })
  } catch (error) {
    console.error('Unexpected error', error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
