import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useScheduleEntries } from './useScheduleEntries'
import { useUpdateScheduleEntryStatus } from './useUpdateScheduleEntryStatus'
import { useProgressNotes } from './useProgressNotes'
import { useAiSuggestions } from './useAiSuggestions'
import { useSaveActivityPlan } from './useSaveActivityPlan'
import { DayScheduleEntryItem } from './DayScheduleEntryItem'
import { NextDayRevisionPanel } from './NextDayRevisionPanel'

export function DayDetailPage() {
  const { studentId, year, month, day } = useParams()
  const numericYear = Number(year)
  const numericMonth = Number(month)
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const { entries, isLoading, error } = useScheduleEntries(
    studentId,
    numericYear,
    numericMonth
  )
  const updateStatus = useUpdateScheduleEntryStatus(studentId, numericYear, numericMonth)
  const { upsertNote } = useProgressNotes(studentId, numericYear, numericMonth)
  const { generateSuggestions, isGenerating, generateError } = useAiSuggestions()
  const saveActivityPlan = useSaveActivityPlan(studentId, numericYear, numericMonth)

  const [suggestions, setSuggestions] = useState(new Map())
  const [suggestionMessage, setSuggestionMessage] = useState(null)

  const dayEntries = entries.filter((entry) => entry.scheduled_date === dateStr)

  function discardSuggestion(entryId) {
    setSuggestions((prev) => {
      const next = new Map(prev)
      next.delete(entryId)
      return next
    })
  }

  async function handleGenerateSuggestions() {
    setSuggestionMessage(null)
    const result = await generateSuggestions({ studentId, targetDate: dateStr })
    setSuggestions(
      new Map((result.suggestions ?? []).map((s) => [s.scheduleEntryId, s.suggestedActivity]))
    )
    if (result.message) setSuggestionMessage(result.message)
  }

  async function handleSaveActivityPlan({ id, activityPlan }) {
    await saveActivityPlan.mutateAsync({ id, activityPlan })
    discardSuggestion(id)
  }

  return (
    <section>
      <h1>{dateStr}</h1>
      <p>
        <Link to={`/students/${studentId}/schedule/${year}/${month}`}>
          Back to calendar
        </Link>
      </p>

      {isLoading && <p>Loading...</p>}
      {error && <p role="alert">Could not load schedule: {error.message}</p>}
      {!isLoading && !error && dayEntries.length === 0 && (
        <p>No subjects scheduled this day.</p>
      )}

      {!isLoading && !error && dayEntries.length > 0 && (
        <div>
          <button type="button" onClick={handleGenerateSuggestions} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : "Suggest activities from yesterday's notes"}
          </button>
          {generateError && (
            <p role="alert">Could not generate suggestions: {generateError.message}</p>
          )}
          {suggestionMessage && <p>{suggestionMessage}</p>}
        </div>
      )}

      {!isLoading && !error && dayEntries.length > 0 && (
        <NextDayRevisionPanel studentId={studentId} sourceDate={dateStr} />
      )}

      <ul>
        {dayEntries.map((entry) => (
          <DayScheduleEntryItem
            key={entry.id}
            entry={entry}
            onUpdateStatus={updateStatus.mutate}
            onUpsertNote={upsertNote}
            suggestedActivity={suggestions.get(entry.id)}
            onSaveActivityPlan={handleSaveActivityPlan}
            onDiscardSuggestion={discardSuggestion}
          />
        ))}
      </ul>
    </section>
  )
}
