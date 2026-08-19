import type { H3Event } from 'h3'
import type { R2Bucket, R2Object } from '@cloudflare/workers-types'
import type { ImageItem } from '~/types/image'
import { buildImageItem } from './image-response'
import { getImageBaseUrl } from './env'

const LIST_PREFIX = 'images/'
const R2_LIST_PAGE_SIZE = 1000

export function mapR2ObjectToImageItem(
  event: H3Event,
  object: R2Object
): ImageItem {
  const imageBaseUrl = getImageBaseUrl(event)
  const uploadedAt = object.customMetadata?.uploadedAt
    ?? object.uploaded.toISOString()
  const originalName = object.customMetadata?.originalName ?? object.key.split('/').pop() ?? 'image'
  const size = Number(object.customMetadata?.size ?? object.size)

  return buildImageItem({
    key: object.key,
    baseUrl: imageBaseUrl,
    originalName,
    contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
    size: Number.isFinite(size) ? size : object.size,
    uploadedAt
  })
}

export async function countImagesInBucket(bucket: R2Bucket): Promise<number> {
  let total = 0
  let cursor: string | undefined

  do {
    const listing = await bucket.list({
      prefix: LIST_PREFIX,
      limit: R2_LIST_PAGE_SIZE,
      cursor
    })
    total += listing.objects.length
    cursor = listing.truncated ? listing.cursor : undefined
  } while (cursor)

  return total
}

export async function searchImagesInBucket(
  event: H3Event,
  bucket: R2Bucket,
  options: {
    query: string
    limit: number
    scanCursor?: string
  }
): Promise<{
  items: ImageItem[]
  scanCursor?: string
  truncated: boolean
}> {
  const needle = options.query.trim().toLowerCase()
  const items: ImageItem[] = []
  let cursor = options.scanCursor

  while (items.length < options.limit) {
    const listing = await bucket.list({
      prefix: LIST_PREFIX,
      limit: R2_LIST_PAGE_SIZE,
      cursor,
      include: ['httpMetadata', 'customMetadata']
    })

    for (const object of listing.objects) {
      const originalName = object.customMetadata?.originalName ?? object.key.split('/').pop() ?? ''
      const haystack = `${object.key}\n${originalName}`.toLowerCase()
      if (!haystack.includes(needle)) {
        continue
      }

      items.push(mapR2ObjectToImageItem(event, object))
      if (items.length >= options.limit) {
        break
      }
    }

    if (!listing.truncated) {
      cursor = undefined
      break
    }

    cursor = listing.cursor

    if (items.length >= options.limit) {
      break
    }
  }

  items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  return {
    items,
    scanCursor: cursor,
    truncated: Boolean(cursor)
  }
}
