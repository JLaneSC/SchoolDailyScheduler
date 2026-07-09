import { supabase } from '../../lib/supabaseClient'

export async function extractCurriculumPlanFromDocument({
  fileBase64,
  studentId,
  year,
  month,
  sourceFilename,
}) {
  const { data, error } = await supabase.functions.invoke('ingest-curriculum-plan', {
    body: { docxBase64: fileBase64, studentId, year, month, sourceFilename },
  })

  if (error) throw error
  return data
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
