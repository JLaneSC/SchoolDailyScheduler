import { supabase } from '../../lib/supabaseClient'

export async function upsertProgressNote({
  scheduleEntryId,
  studentId,
  subjectId,
  entryDate,
  skillsMastered,
  conceptsToReinforce,
  highInterestTopics,
  learningStyleNotes,
  behaviorAttentionNotes,
}) {
  const { data, error } = await supabase
    .from('progress_entries')
    .upsert(
      {
        schedule_entry_id: scheduleEntryId,
        student_id: studentId,
        subject_id: subjectId,
        entry_date: entryDate,
        skills_mastered: skillsMastered || null,
        concepts_to_reinforce: conceptsToReinforce || null,
        high_interest_topics: highInterestTopics || null,
        learning_style_notes: learningStyleNotes || null,
        behavior_attention_notes: behaviorAttentionNotes || null,
      },
      { onConflict: 'schedule_entry_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}
