import { useState } from 'react'
import { useSubjects } from '../subjects/useSubjects'
import { fileToBase64 } from './ingestStandardsApi'

export function StandardUploadForm({ onIngest, isIngesting, ingestError }) {
  const { subjects } = useSubjects()
  const [file, setFile] = useState(null)
  const [subjectId, setSubjectId] = useState('')
  const [scopeInstruction, setScopeInstruction] = useState('')
  const [resultMessage, setResultMessage] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file || !subjectId || !scopeInstruction.trim()) return

    setResultMessage(null)
    const fileBase64 = await fileToBase64(file)
    const result = await onIngest({
      fileBase64,
      subjectId,
      scopeInstruction: scopeInstruction.trim(),
      sourceFilename: file.name,
    })
    setResultMessage(
      result.message ?? `Extracted and saved ${result.insertedCount} standard(s) for review.`
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="standard-file">Standards document (PDF)</label>
        <input
          id="standard-file"
          type="file"
          accept="application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div>
        <label htmlFor="standard-subject">Subject</label>
        <select
          id="standard-subject"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
        >
          <option value="">Select a subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="standard-scope">Extraction scope</label>
        <input
          id="standard-scope"
          type="text"
          placeholder="e.g. Grade 1, K-2, Middle Level band"
          value={scopeInstruction}
          onChange={(event) => setScopeInstruction(event.target.value)}
        />
        <p>
          Keep this narrow &mdash; one grade (or one grade+strand, or one
          proficiency band) per extraction run, for best accuracy and a
          reviewable batch size.
        </p>
      </div>

      <button type="submit" disabled={isIngesting || !file || !subjectId || !scopeInstruction.trim()}>
        {isIngesting ? 'Extracting... this can take a minute for large documents' : 'Extract'}
      </button>

      {ingestError && <p role="alert">Could not extract standards: {ingestError.message}</p>}
      {resultMessage && <p>{resultMessage}</p>}
    </form>
  )
}
