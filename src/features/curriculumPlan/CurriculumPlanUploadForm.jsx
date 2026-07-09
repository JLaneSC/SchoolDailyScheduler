import { useState } from 'react'
import { fileToBase64 } from './ingestCurriculumPlanApi'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function CurriculumPlanUploadForm({ studentId, onExtract, isExtracting, extractError }) {
  const [file, setFile] = useState(null)
  const [month, setMonth] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file || !month) return

    const fileBase64 = await fileToBase64(file)
    await onExtract({
      fileBase64,
      studentId,
      year: Number(year),
      month: Number(month),
      sourceFilename: file.name,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="curriculum-file">Curriculum plan document (.docx)</label>
        <input
          id="curriculum-file"
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div>
        <label htmlFor="curriculum-month">Month</label>
        <select id="curriculum-month" value={month} onChange={(event) => setMonth(event.target.value)}>
          <option value="">Select a month</option>
          {MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="curriculum-year">Year</label>
        <input
          id="curriculum-year"
          type="number"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        />
      </div>

      <button type="submit" disabled={isExtracting || !file || !month}>
        {isExtracting ? 'Extracting... this can take a minute' : 'Extract'}
      </button>

      {extractError && <p role="alert">Could not extract curriculum plan: {extractError.message}</p>}
    </form>
  )
}
