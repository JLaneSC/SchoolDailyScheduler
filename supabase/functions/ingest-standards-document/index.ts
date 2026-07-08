// Deno Edge Function — Deno is TS-native, so this is one of two TS files in
// an otherwise-JS project (see suggest-daily-activities/index.ts). Not an
// inconsistency, just the right tool here.
//
// Reads the caller's own data (RLS-scoped via their forwarded JWT — never a
// service-role key), sends an uploaded state-standards PDF to Claude for
// structured extraction, and returns the extracted entries. This function
// never writes to the database — the client inserts extracted rows as
// 'pending_review', and only an explicit user approval flips them to
// 'approved'. Every code/description/grade-band label Claude returns must
// come directly from the attached document; the model is instructed to
// never invent a code and to set code to null if the source has none.
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

const SYSTEM_PROMPT = `You are extracting official state learning standards from an attached source document. Extract every standard/indicator that matches the requested scope. Every code, description, and grade-band label you return MUST come directly from the attached document's text — never infer, generalize, paraphrase from outside knowledge, or recall a standard from your training data. If the document has no short code for a given item, set "code" to null rather than inventing one. Keep each "description" to 1-3 sentences that concisely restate the standard — do not copy long clarification/enduring-understanding prose verbatim. If nothing in the document matches the requested scope, return an empty "entries" array — do not fabricate entries to satisfy the request.`

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
      pdfBase64?: string
      subjectId?: string
      scopeInstruction?: string
      sourceFilename?: string
    }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { pdfBase64, subjectId, scopeInstruction, sourceFilename } = body
    if (!pdfBase64 || !subjectId || !scopeInstruction || !sourceFilename) {
      return json(
        { error: 'pdfBase64, subjectId, scopeInstruction, and sourceFilename are required' },
        400
      )
    }

    // Request-scoped client: every query below runs AS the calling user via
    // RLS, exactly like a client-side call. No service-role key anywhere.
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Cheap existence check, not load-bearing for security — RLS enforces
    // the real boundary whenever the client later inserts standards rows.
    const { data: subjectRow, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .maybeSingle()

    if (subjectError) {
      console.error('subjectError', subjectError)
      return json({ error: 'Could not verify subject' }, 500)
    }
    if (!subjectRow) {
      return json({ error: 'Subject not found' }, 400)
    }

    const userPrompt = `Extraction scope: ${scopeInstruction}\nSource file: ${sourceFilename}`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 12000,
        thinking: { type: 'adaptive' },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
              },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
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
                      code: { type: ['string', 'null'] },
                      description: { type: 'string' },
                      gradeBandLabel: { type: 'string' },
                    },
                    required: ['code', 'description', 'gradeBandLabel'],
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
        scopeInstruction,
        sourceFilename,
        message: 'The AI declined to process this document.',
      })
    }

    if (anthropicData.stop_reason === 'max_tokens') {
      return json(
        {
          error:
            'Response was truncated — try a narrower extraction scope (e.g. one grade at a time).',
        },
        502
      )
    }

    const textBlock = (anthropicData.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) {
      console.error('No text block in Anthropic response', anthropicData)
      return json({ error: 'AI response was empty' }, 502)
    }

    let parsed: { entries?: { code: string | null; description: string; gradeBandLabel: string }[] }
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      console.error('Failed to parse AI JSON', textBlock.text)
      return json({ error: 'AI response was not valid JSON' }, 502)
    }

    return json({
      entries: parsed.entries ?? [],
      scopeInstruction,
      sourceFilename,
    })
  } catch (error) {
    console.error('Unexpected error', error)
    return json({ error: 'Unexpected server error' }, 500)
  }
})
