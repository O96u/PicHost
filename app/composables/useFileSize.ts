export const QUOTA_UNITS = ['KB', 'MB', 'GB', 'TB'] as const
export type QuotaUnit = typeof QUOTA_UNITS[number]

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = bytes / 1024
  let unitIndex = 0

  while (unitIndex < units.length - 1 && value >= 1024) {
    value /= 1024
    unitIndex++
  }

  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(decimals)} ${units[unitIndex]}`
}

export function bytesToQuotaInput(bytes: number | null): { value: string, unit: QuotaUnit } {
  if (!bytes || bytes <= 0) {
    return { value: '', unit: 'GB' }
  }

  let value = bytes / 1024
  let unitIndex = 0

  while (unitIndex < QUOTA_UNITS.length - 1 && value >= 1024) {
    value /= 1024
    unitIndex++
  }

  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2
  const rounded = Number(value.toFixed(decimals))
  const unit: QuotaUnit = QUOTA_UNITS[unitIndex] ?? 'GB'
  return { value: String(rounded), unit }
}

export function quotaToBytes(value: string | number, unit: QuotaUnit): number | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const unitIndex = QUOTA_UNITS.indexOf(unit)
  if (unitIndex < 0) return null

  return Math.round(amount * 1024 ** (unitIndex + 1))
}

export function useFileSize() {
  return { formatFileSize, bytesToQuotaInput, quotaToBytes, QUOTA_UNITS }
}
