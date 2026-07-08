import { supabase } from '../../lib/supabaseClient'

export async function getStandards({ status, subjectId } = {}) {
  let query = supabase
    .from('standards')
    .select('*, subjects(name), grade_bands(label)')
    .order('sort_order', { ascending: true })

  if (status) query = query.eq('status', status)
  if (subjectId) query = query.eq('subject_id', subjectId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function insertPendingStandards(rows) {
  const { data, error } = await supabase
    .from('standards')
    .insert(
      rows.map((row) => ({
        subject_id: row.subjectId,
        grade_band_id: row.gradeBandId,
        code: row.code,
        description: row.description,
        sort_order: row.sortOrder,
        status: 'pending_review',
        source_document: row.sourceDocument,
      }))
    )
    .select()

  if (error) throw error
  return data
}

export async function updateStandard(id, { code, description, gradeBandId }) {
  const { data, error } = await supabase
    .from('standards')
    .update({ code, description, grade_band_id: gradeBandId })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function approveStandards(ids) {
  const { error } = await supabase
    .from('standards')
    .update({ status: 'approved' })
    .in('id', ids)

  if (error) throw error
}

export async function rejectStandards(ids) {
  const { error } = await supabase.from('standards').delete().in('id', ids)
  if (error) throw error
}
