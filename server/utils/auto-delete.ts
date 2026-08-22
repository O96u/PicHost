import { insertActivityLog, listAdminUserIds, listUserAutoDeletePolicies, type AutoDeletePolicy } from './db'
import { getGlobalAutoDeletePolicy } from './env'
import { deleteImage, headImage, listImageKeys, type StoredImage } from './storage'
import { logInfo, logWarn } from './logger'

export interface AutoDeleteResult {
  deleted: number
  failed: number
  skipped: boolean
  days: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function imageAgeDays(uploadedMs: number, nowMs: number): number {
  return (nowMs - uploadedMs) / MS_PER_DAY
}

function policyMatches(
  uploadedMs: number,
  nowMs: number,
  policy: AutoDeletePolicy
): boolean {
  if (policy.days <= 0) return false

  if (policy.enabledAt) {
    const enabledMs = new Date(policy.enabledAt).getTime()
    if (!Number.isFinite(enabledMs) || uploadedMs < enabledMs) {
      return false
    }
  }

  return imageAgeDays(uploadedMs, nowMs) >= policy.days
}

export function shouldAutoDeleteImage(
  image: StoredImage,
  globalPolicy: AutoDeletePolicy,
  adminUserIds: Set<number>,
  userPolicies: Map<number, AutoDeletePolicy>,
  nowMs = Date.now()
): boolean {
  const uploadedMs = new Date(image.uploadedAt).getTime()
  if (!Number.isFinite(uploadedMs) || uploadedMs > nowMs) {
    return false
  }

  const ownerId = image.userId ?? null

  if (ownerId != null) {
    const userPolicy = userPolicies.get(ownerId)
    if (userPolicy && policyMatches(uploadedMs, nowMs, userPolicy)) {
      return true
    }

    if (adminUserIds.has(ownerId) && policyMatches(uploadedMs, nowMs, globalPolicy)) {
      return true
    }

    return false
  }

  return policyMatches(uploadedMs, nowMs, globalPolicy)
}

export async function runAutoDeleteCleanup(): Promise<AutoDeleteResult> {
  const globalPolicy = getGlobalAutoDeletePolicy()
  const userPolicies = listUserAutoDeletePolicies()
  const adminUserIds = listAdminUserIds()

  if (globalPolicy.days <= 0 && userPolicies.size === 0) {
    return { deleted: 0, failed: 0, skipped: true, days: 0 }
  }

  const nowMs = Date.now()
  const keys = await listImageKeys()
  let deleted = 0
  let failed = 0

  for (const key of keys) {
    const image = await headImage(key)
    if (!image) continue

    if (!shouldAutoDeleteImage(image, globalPolicy, adminUserIds, userPolicies, nowMs)) {
      continue
    }

    try {
      await deleteImage(key)
      insertActivityLog({
        action: 'delete',
        key,
        originalName: image.originalName,
        size: image.size,
        contentType: image.contentType,
        source: 'web'
      })
      deleted++
    } catch (error) {
      logWarn('auto-delete failed', { key, error })
      failed++
    }
  }

  if (deleted > 0 || failed > 0) {
    logInfo('auto-delete cleanup finished', { globalDays: globalPolicy.days, deleted, failed })
  }

  return { deleted, failed, skipped: false, days: globalPolicy.days }
}
