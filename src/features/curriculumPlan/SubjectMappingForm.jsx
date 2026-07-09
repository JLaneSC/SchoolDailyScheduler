import { useState } from 'react'

const NEW_SUBJECT_VALUE = '__new__'

export function SubjectMappingForm({ distinctNames, subjectSuggestions, subjects, onConfirm, onCancel, isSaving }) {
  const [selections, setSelections] = useState(() =>
    Object.fromEntries(
      distinctNames.map((name) => {
        const suggestion = subjectSuggestions.get(name)
        return [name, suggestion ? suggestion.id : NEW_SUBJECT_VALUE]
      })
    )
  )
  const [newNames, setNewNames] = useState(() =>
    Object.fromEntries(distinctNames.map((name) => [name, name]))
  )

  function handleSubmit(event) {
    event.preventDefault()
    const mapping = new Map()
    for (const name of distinctNames) {
      const selection = selections[name]
      if (selection === NEW_SUBJECT_VALUE) {
        mapping.set(name, { type: 'new', name: newNames[name].trim() })
      } else {
        mapping.set(name, { type: 'existing', subjectId: selection })
      }
    }
    onConfirm(mapping)
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>
        Extracted subject names don&rsquo;t always match your existing subjects
        exactly. Confirm where each one should go before anything is saved.
      </p>
      <ul>
        {distinctNames.map((name) => {
          const suggestion = subjectSuggestions.get(name)
          return (
            <li key={name}>
              <strong>{name}</strong>
              {suggestion && (
                <span> (suggested match: {suggestion.name})</span>
              )}
              <div>
                <label htmlFor={`mapping-${name}`}>Map to</label>
                <select
                  id={`mapping-${name}`}
                  value={selections[name]}
                  onChange={(event) =>
                    setSelections((prev) => ({ ...prev, [name]: event.target.value }))
                  }
                >
                  <option value={NEW_SUBJECT_VALUE}>&mdash; Create new subject &mdash;</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              {selections[name] === NEW_SUBJECT_VALUE && (
                <div>
                  <label htmlFor={`new-name-${name}`}>New subject name</label>
                  <input
                    id={`new-name-${name}`}
                    type="text"
                    value={newNames[name]}
                    onChange={(event) =>
                      setNewNames((prev) => ({ ...prev, [name]: event.target.value }))
                    }
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Confirm and save for review'}
      </button>
      <button type="button" onClick={onCancel} disabled={isSaving}>
        Cancel
      </button>
    </form>
  )
}
