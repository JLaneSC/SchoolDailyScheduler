import { supabase } from '../../lib/supabaseClient'

export async function getGradeBands() {
  const { data, error } = await supabase
    .from('grade_bands')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function addGradeBand({ label, sortOrder }) {
  const { data, error } = await supabase
    .from('grade_bands')
    .insert({ label, sort_order: sortOrder ?? 0 })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateGradeBand(id, { label, sortOrder }) {
  const { data, error } = await supabase
    .from('grade_bands')
    .update({ label, sort_order: sortOrder ?? 0 })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteGradeBand(id) {
  const { error } = await supabase.from('grade_bands').delete().eq('id', id)
  if (error) throw error
}

// Not race-safe under concurrent calls — acceptable since this is driven by
// one interactive admin user, not a background job.
export async function findOrCreateGradeBand(label) {
  const trimmed = label.trim()

  const { data: existing, error: findError } = await supabase
    .from('grade_bands')
    .select('*')
    .eq('label', trimmed)
    .maybeSingle()

  if (findError) throw findError
  if (existing) return existing

  return addGradeBand({ label: trimmed })
}
