import { useState } from 'react'

const FIELDS = [
  {
    key: 'skillsMastered',
    dbKey: 'skills_mastered',
    label: 'Skills mastered today',
    placeholder: 'e.g. counting by 5s, identifying main character, blending 3-letter words',
  },
  {
    key: 'conceptsToReinforce',
    dbKey: 'concepts_to_reinforce',
    label: 'Concepts needing reinforcement',
    placeholder: 'e.g. telling time to 5 minutes, opinion writing with reasoning, place value to 100',
  },
  {
    key: 'highInterestTopics',
    dbKey: 'high_interest_topics',
    label: 'High interest topics/activities',
    placeholder: 'e.g. dinosaurs, hands-on experiments, building/construction, space exploration',
  },
  {
    key: 'learningStyleNotes',
    dbKey: 'learning_style_notes',
    label: 'Learning style observations',
    placeholder: 'e.g. responded well to movement breaks, needed visual supports, excelled with hands-on materials',
  },
  {
    key: 'behaviorAttentionNotes',
    dbKey: 'behavior_attention_notes',
    label: 'Behavioral/attention patterns',
    placeholder: 'e.g. focused best in morning, needed redirection after 15 minutes, engaged longer with self-selected activities',
  },
]

export function ProgressNoteForm({ initialValues, onSubmit, onCancel }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(FIELDS.map(({ key, dbKey }) => [key, initialValues?.[dbKey] ?? '']))
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(
        Object.fromEntries(FIELDS.map(({ key }) => [key, values[key].trim()]))
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label htmlFor={`progress-note-${key}`}>{label}</label>
          <textarea
            id={`progress-note-${key}`}
            placeholder={placeholder}
            value={values[key]}
            onChange={(event) => update(key, event.target.value)}
          />
        </div>
      ))}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save note'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      )}
    </form>
  )
}
