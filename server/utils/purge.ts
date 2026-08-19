import type { H3Event } from 'h3'
import { getImageWorkerPurgeUrl, getInternalPurgeToken } from './env'

export async function purgeImageCache(
  event: H3Event,
  keys: string[]
): Promise<{ success: boolean, failedKeys: string[] }> {
  const purgeUrl = getImageWorkerPurgeUrl(event)
  const token = getInternalPurgeToken(event)

  if (!purgeUrl || !token || keys.length === 0) {
    return { success: true, failedKeys: [] }
  }

  try {
    const response = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ keys })
    })

    if (!response.ok) {
      return { success: false, failedKeys: keys }
    }

    try {
      const data = await response.json() as { failed?: string[] }
      return {
        success: true,
        failedKeys: data.failed ?? []
      }
    } catch {
      return { success: true, failedKeys: [] }
    }
  } catch {
    return { success: false, failedKeys: keys }
  }
}
