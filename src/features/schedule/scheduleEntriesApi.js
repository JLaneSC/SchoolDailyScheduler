import { supabase } from '../../lib/supabaseClient'

export async function getScheduleEntriesForSchoolYear(schoolYearId) {
  const { data: entries, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('school_year_id', schoolYearId)

  if (error) throw error
  if (entries.length === 0) return []

  const entryIds = entries.map((entry) => entry.id)
  const { data: progressLinks, error: progressError } = await supabase
    .from('progress_entries')
    .select('schedule_entry_id')
    .in('schedule_entry_id', entryIds)

  if (progressError) throw progressError

  const { data: standardLinks, error: standardLinksError } = await supabase
    .from('schedule_entry_standards')
    .select('schedule_entry_id')
    .eq('status', 'approved')
    .in('schedule_entry_id', entryIds)

  if (standardLinksError) throw standardLinksError

  const linkedIds = new Set(progressLinks.map((link) => link.schedule_entry_id))
  const standardLinkedIds = new Set(standardLinks.map((link) => link.schedule_entry_id))
  return entries.map((entry) => ({
    ...entry,
    hasProgressNote: linkedIds.has(entry.id),
    hasApprovedStandardLinks: standardLinkedIds.has(entry.id),
  }))
}

export async function applyScheduleDiff({ toInsert, toUpdateDayNumber, toDelete }) {
  if (toInsert.length > 0) {
    const { error } = await supabase.from('schedule_entries').insert(toInsert)
    if (error) throw error
  }

  if (toUpdateDayNumber.length > 0) {
    await Promise.all(
      toUpdateDayNumber.map(async ({ id, day_number }) => {
        const { error } = await supabase
          .from('schedule_entries')
          .update({ day_number })
          .eq('id', id)
        if (error) throw error
      })
    )
  }

  if (toDelete.length > 0) {
    const { error } = await supabase.from('schedule_entries').delete().in('id', toDelete)
    if (error) throw error
  }
}

export async function getScheduleEntriesForMonth(studentId, year, month) {
  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonthDate = new Date(Date.UTC(year, month, 1))
  const firstOfNextMonth = nextMonthDate.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('schedule_entries')
    .select('*, subjects(name)')
    .eq('student_id', studentId)
    .gte('scheduled_date', firstOfMonth)
    .lt('scheduled_date', firstOfNextMonth)
    .order('scheduled_date', { ascending: true })

  if (error) throw error
  if (data.length === 0) return data

  const entryIds = data.map((entry) => entry.id)
  const { data: notes, error: notesError } = await supabase
    .from('progress_entries')
    .select('*')
    .in('schedule_entry_id', entryIds)

  if (notesError) throw notesError

  const { data: standardLinks, error: standardLinksError } = await supabase
    .from('schedule_entry_standards')
    .select('schedule_entry_id, standards(id, code, description)')
    .eq('status', 'approved')
    .in('schedule_entry_id', entryIds)

  if (standardLinksError) throw standardLinksError

  const notesByEntryId = new Map(notes.map((note) => [note.schedule_entry_id, note]))
  const standardsByEntryId = new Map()
  for (const link of standardLinks) {
    const list = standardsByEntryId.get(link.schedule_entry_id) ?? []
    list.push(link.standards)
    standardsByEntryId.set(link.schedule_entry_id, list)
  }

  return data.map((entry) => ({
    ...entry,
    progressNote: notesByEntryId.get(entry.id) ?? null,
    approvedStandards: standardsByEntryId.get(entry.id) ?? [],
  }))
}

export async function updateScheduleEntryStatus(id, status) {
  const { data, error } = await supabase
    .from('schedule_entries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveActivityPlan(id, activityPlan) {
  const { data, error } = await supabase
    .from('schedule_entries')
    .update({ activity_plan: activityPlan, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
