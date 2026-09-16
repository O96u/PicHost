import type { MultiPartData } from 'h3'

export function readMultipartFormFieldValues(
  formData: MultiPartData[],
  fieldName: string
): string[] {
  const field = formData.find(part => part.name === fieldName)
  if (field?.data?.length) {
    const raw = new TextDecoder().decode(field.data).trim()
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean)
      }
    } catch {
      // fall through to comma-separated parsing
    }
    return raw.split(',').map(item => item.trim()).filter(Boolean)
  }

  const repeatFields = formData.filter(
    part => part.name === fieldName && part.data?.length
  )
  if (!repeatFields.length) return []

  return repeatFields
    .map(part => new TextDecoder().decode(part.data!).trim())
    .filter(Boolean)
}
