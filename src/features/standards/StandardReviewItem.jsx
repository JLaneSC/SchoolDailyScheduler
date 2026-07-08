import { useState } from 'react'

export function StandardReviewItem({ standard, gradeBands, onUpdate, onApprove, onReject }) {
  const [isEditing, setIsEditing] = useState(false)
  const [code, setCode] = useState(standard.code ?? '')
  const [description, setDescription] = useState(standard.description)
  const [gradeBandId, setGradeBandId] = useState(standard.grade_band_id ?? '')

  async function handleSave(event) {
    event.preventDefault()
    await onUpdate({
      id: standard.id,
      code: code.trim() || null,
      description: description.trim(),
      gradeBandId: gradeBandId || null,
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <li>
        <form onSubmit={handleSave}>
          <div>
            <label htmlFor={`code-${standard.id}`}>Code (optional)</label>
            <input
              id={`code-${standard.id}`}
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`description-${standard.id}`}>Description</label>
            <textarea
              id={`description-${standard.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`grade-band-${standard.id}`}>Grade band</label>
            <select
              id={`grade-band-${standard.id}`}
              value={gradeBandId}
              onChange={(event) => setGradeBandId(event.target.value)}
            >
              <option value="">No grade band</option>
              {gradeBands.map((gradeBand) => (
                <option key={gradeBand.id} value={gradeBand.id}>
                  {gradeBand.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </form>
      </li>
    )
  }

  return (
    <li>
      {standard.code && <strong>{standard.code}</strong>}
      <span> {standard.description}</span>
      {standard.grade_bands?.label && <span> &mdash; {standard.grade_bands.label}</span>}
      <div>
        <button type="button" onClick={() => setIsEditing(true)}>
          Edit
        </button>
        <button type="button" onClick={() => onApprove(standard.id)}>
          Approve
        </button>
        <button type="button" onClick={() => onReject(standard.id)}>
          Reject
        </button>
      </div>
    </li>
  )
}
