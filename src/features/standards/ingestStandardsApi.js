import { supabase } from '../../lib/supabaseClient'

export async function extractStandardsFromDocument({
  fileBase64,
  subjectId,
  scopeInstruction,
  sourceFilename,
}) {
  const { data, error } = await supabase.functions.invoke('ingest-standards-document', {
    body: { pdfBase64: fileBase64, subjectId, scopeInstruction, sourceFilename },
  })

  if (error) throw error
  return data
}

// FileReader's readAsDataURL output has no embedded newlines, so the
// stripped base64 is already in the shape the Anthropic API expects.
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
