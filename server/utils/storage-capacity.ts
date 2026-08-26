import { statfs } from 'node:fs/promises'
import { getDataDir } from './data-dir'
import { LOCAL_BACKEND_ID } from './storage-backends'

export interface StorageCapacity {
  totalBytes: number | null
  usedBytes: number
  freeBytes: number | null
  percent: number | null
  source: 'disk' | 'quota'
}

export function parseQuotaBytes(raw: unknown): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

export async function getLocalVolumeStats(): Promise<{
  totalBytes: number
  freeBytes: number
  usedBytes: number
} | null> {
  try {
    const stats = await statfs(getDataDir())
    const totalBytes = Number(stats.bsize) * Number(stats.blocks)
    const freeBytes = Number(stats.bsize) * Number(stats.bavail)
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null
    return {
      totalBytes,
      freeBytes: Math.max(0, freeBytes),
      usedBytes: Math.max(0, totalBytes - freeBytes)
    }
  } catch {
    return null
  }
}

function buildQuotaCapacity(quotaBytes: number, indexBytes: number): StorageCapacity {
  const usedBytes = indexBytes
  const freeBytes = Math.max(0, quotaBytes - usedBytes)
  const percent = Math.round((usedBytes / quotaBytes) * 1000) / 10
  return {
    totalBytes: quotaBytes,
    usedBytes,
    freeBytes,
    percent,
    source: 'quota'
  }
}

export async function buildBackendCapacity(
  backendId: string,
  backendType: 'local' | 's3',
  indexBytes: number,
  quotaBytes: number | null
): Promise<StorageCapacity> {
  if (backendType === 's3') {
    if (quotaBytes && quotaBytes > 0) {
      return buildQuotaCapacity(quotaBytes, indexBytes)
    }
    return {
      totalBytes: null,
      usedBytes: indexBytes,
      freeBytes: null,
      percent: null,
      source: 'quota'
    }
  }

  if (backendId === LOCAL_BACKEND_ID || backendType === 'local') {
    const volume = await getLocalVolumeStats()
    if (volume) {
      const percent = Math.round((volume.usedBytes / volume.totalBytes) * 1000) / 10
      return {
        totalBytes: volume.totalBytes,
        usedBytes: volume.usedBytes,
        freeBytes: volume.freeBytes,
        percent,
        source: 'disk'
      }
    }
  }

  return {
    totalBytes: null,
    usedBytes: indexBytes,
    freeBytes: null,
    percent: null,
    source: 'disk'
  }
}
