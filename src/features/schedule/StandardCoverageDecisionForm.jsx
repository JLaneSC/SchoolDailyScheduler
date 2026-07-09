import { useState } from 'react'

const OPTIONS = [
  { value: 'replacement', label: "AI's replacement" },
  { value: 'as-is', label: 'Original plan, as-is' },
  { value: 'blend', label: 'Blend of both' },
]

export function StandardCoverageDecisionForm({ entry, targetDate, onApply, isApplying }) {
  const [choice, setChoice] = useState('blend')

  return (
    <div>
      <h4>{entry.subjectName} &mdash; {targetDate}</h4>
      <p role="alert">
        Changing this day would drop{' '}
        {entry.lostStandards.map((s) => s.code).join(', ')} — not covered by
        any other scheduled day this school year. Choose how to proceed
        before anything is saved.
      </p>

      <fieldset>
        <legend>Original plan (as scheduled)</legend>
        <p>{entry.currentActivityPlan ?? '(none set)'}</p>
        <p>
          Standards: {entry.currentStandards.map((s) => s.code).join(', ') || '(none)'}
        </p>
      </fieldset>

      <fieldset>
        <legend>AI's replacement</legend>
        <p>{entry.proposedActivityPlan}</p>
        <p>Standards: {entry.proposedStandards.map((s) => s.code).join(', ') || '(none)'}</p>
      </fieldset>

      <fieldset>
        <legend>Blend (keeps every current standard)</legend>
        <p>{entry.blendedActivityPlan}</p>
        <p>Standards: {entry.blendedStandards.map((s) => s.code).join(', ') || '(none)'}</p>
      </fieldset>

      <div>
        {OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={`decision-${entry.scheduleEntryId}`}
              value={option.value}
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>

      <button type="button" onClick={() => onApply(choice)} disabled={isApplying}>
        {isApplying ? 'Applying...' : 'Apply'}
      </button>
    </div>
  )
}
