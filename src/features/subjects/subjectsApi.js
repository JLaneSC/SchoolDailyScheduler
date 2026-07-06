import { supabase } from '../../lib/supabaseClient'

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function addSubject({ name, description }) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ name, description: description || null })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSubject(id, { name, description }) {
  const { data, error } = await supabase
    .from('subjects')
    .update({ name, description: description || null })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
}
