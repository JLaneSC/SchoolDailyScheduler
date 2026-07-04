import { supabase } from '../../lib/supabaseClient'

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function addStudent({ name, gradeLevel, birthDate, notes }) {
  const { data, error } = await supabase
    .from('students')
    .insert({
      name,
      grade_level: gradeLevel,
      birth_date: birthDate || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateStudent(id, { name, gradeLevel, birthDate, notes }) {
  const { data, error } = await supabase
    .from('students')
    .update({
      name,
      grade_level: gradeLevel,
      birth_date: birthDate || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}
