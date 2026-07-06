import { supabase } from '../../lib/supabaseClient'

export async function getSupplyItems() {
  const { data, error } = await supabase
    .from('supply_items')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function addSupplyItem({ name, quantity, notes }) {
  const { data, error } = await supabase
    .from('supply_items')
    .insert({
      name,
      quantity: quantity === '' || quantity == null ? null : Number(quantity),
      notes: notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSupplyItem(id, { name, quantity, notes }) {
  const { data, error } = await supabase
    .from('supply_items')
    .update({
      name,
      quantity: quantity === '' || quantity == null ? null : Number(quantity),
      notes: notes || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSupplyItem(id) {
  const { error } = await supabase.from('supply_items').delete().eq('id', id)
  if (error) throw error
}
