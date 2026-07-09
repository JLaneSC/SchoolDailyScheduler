import { supabase } from '../../lib/supabaseClient'

export async function getCurriculumPlanEntries({ studentId, status, year, month } = {}) {
  let query = supabase
    .from('curriculum_plan_entries')
    .select('*, subjects(name)')
    .eq('student_id', studentId)
    .order('year', { ascending: true })
    .order('month', { ascending: true })
    .order('sort_order', { ascending: true })

  if (status) query = query.eq('status', status)
  if (year) query = query.eq('year', year)
  if (month) query = query.eq('month', month)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function insertPendingEntries(rows) {
  const { data, error } = await supabase
    .from('curriculum_plan_entries')
    .insert(
      rows.map((row) => ({
        student_id: row.studentId,
        subject_id: row.subjectId,
        standard_id: row.standardId ?? null,
        year: row.year,
        month: row.month,
        focus_text: row.focusText,
        standards_text: row.standardsText,
        mastery_status: row.masteryStatus,
        mastery_percentage: row.masteryPercentage,
        sort_order: row.sortOrder,
        status: 'pending_review',
        source_document: row.sourceDocument,
      }))
    )
    .select()

  if (error) throw error
  return data
}

export async function updateEntry(id, { subjectId, focusText, standardsText, masteryStatus, masteryPercentage }) {
  const { data, error } = await supabase
    .from('curriculum_plan_entries')
    .update({
      subject_id: subjectId,
      focus_text: focusText,
      standards_text: standardsText,
      mastery_status: masteryStatus,
      mastery_percentage: masteryPercentage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function approveEntries(ids) {
  const { error } = await supabase
    .from('curriculum_plan_entries')
    .update({ status: 'approved' })
    .in('id', ids)

  if (error) throw error
}

export async function rejectEntries(ids) {
  const { error } = await supabase.from('curriculum_plan_entries').delete().in('id', ids)
  if (error) throw error
}

// Read-only, case-insensitive lookup — used to SUGGEST a mapping in the
// review UI. Deliberately never creates a subject: an extracted name like
// "MATH" must not silently become a second, disconnected subject from an
// existing "Math" used for actual scheduling — the user confirms every
// mapping (existing subject or explicit new one) before anything is
// written. See CurriculumPlanUploadForm.jsx's subject-mapping step.
export async function findSubjectByName(name) {
  const trimmed = name.trim()

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .ilike('name', trimmed)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

// Only attempted when the raw standards text is a single, unambiguous code
// (no comma or en-dash) — anything else stays unlinked (standards_text
// still holds the full truth). Returns null rather than throwing when
// there's no match; the standards table may simply not have this code
// approved yet.
export async function matchApprovedStandardByCode(code) {
  if (!code) return null
  const trimmed = code.trim()
  // En-dash (–) marks a range like "3.NR.2.1–2.6" — a plain hyphen is
  // legitimately part of many real codes (e.g. "N-1.1.1"), so only the
  // en-dash and comma disqualify a code as ambiguous/multi-valued here.
  if (trimmed.includes(',') || trimmed.includes('–')) {
    return null
  }

  const { data, error } = await supabase
    .from('standards')
    .select('id')
    .eq('code', trimmed)
    .eq('status', 'approved')
    .maybeSingle()

  if (error) throw error
  return data?.id ?? null
}
