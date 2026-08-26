import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import type { Readable } from 'node:stream'
import { validateImageKey } from '../image-key'
import type {
  S3BackendConfig,
  S3BackendSecrets,
  ServingMode,
  StoredImage,
  StoredImageMeta,
  StorageBackend
} from './types'

function contentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

export function buildObjectKey(prefix: string | undefined, key: string): string {
  const trimmed = prefix?.replace(/^\/+|\/+$/g, '') ?? ''
  return trimmed ? `${trimmed}/${key}` : key
}

export function parseS3Config(raw: string): S3BackendConfig | null {
  try {
    const parsed = JSON.parse(raw) as Partial<S3BackendConfig>
    if (!parsed.endpoint || !parsed.region || !parsed.bucket) return null
    return {
      endpoint: parsed.endpoint,
      region: parsed.region,
      bucket: parsed.bucket,
      prefix: parsed.prefix,
      forcePathStyle: parsed.forcePathStyle ?? false
    }
  } catch {
    return null
  }
}

export function parseS3Secrets(raw: string): S3BackendSecrets | null {
  try {
    const parsed = JSON.parse(raw) as Partial<S3BackendSecrets>
    if (!parsed.accessKeyId || !parsed.secretAccessKey) return null
    return {
      accessKeyId: parsed.accessKeyId,
      secretAccessKey: parsed.secretAccessKey
    }
  } catch {
    return null
  }
}

export function validateS3Config(config: S3BackendConfig): string | null {
  if (!config.endpoint.startsWith('http')) {
    return 'Endpoint 需为 http(s) 地址'
  }
  if (!config.bucket.trim()) {
    return 'Bucket 不能为空'
  }
  return null
}

export class S3StorageBackend implements StorageBackend {
  readonly id: string
  readonly type = 's3' as const
  readonly servingMode: ServingMode
  readonly publicUrl: string
  private readonly client: S3Client
  private readonly bucket: string
  private readonly prefix: string | undefined

  constructor(
    id: string,
    config: S3BackendConfig,
    secrets: S3BackendSecrets,
    servingMode: ServingMode = 'proxy',
    publicUrl = ''
  ) {
    this.id = id
    this.servingMode = servingMode
    this.publicUrl = publicUrl
    this.bucket = config.bucket
    this.prefix = config.prefix
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: secrets.accessKeyId,
        secretAccessKey: secrets.secretAccessKey
      },
      forcePathStyle: config.forcePathStyle ?? false
    })
  }

  private objectKey(key: string): string {
    return buildObjectKey(this.prefix, key)
  }

  async put(key: string, bytes: Uint8Array, meta: StoredImageMeta): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.objectKey(key),
      Body: bytes,
      ContentType: meta.contentType,
      Metadata: {
        originalName: meta.originalName,
        uploadedAt: meta.uploadedAt,
        userId: meta.userId != null ? String(meta.userId) : ''
      }
    }))
  }

  async head(key: string): Promise<StoredImage | null> {
    if (!validateImageKey(key)) return null

    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(key)
      }))

      const uploadedAt = response.Metadata?.uploadedat
        ?? response.LastModified?.toISOString()
        ?? new Date().toISOString()
      const originalName = response.Metadata?.originalname
        ?? key.split('/').pop()
        ?? 'image'
      const userIdRaw = response.Metadata?.userid
      const userId = userIdRaw ? Number(userIdRaw) : null

      return {
        key,
        size: response.ContentLength ?? 0,
        mtimeMs: response.LastModified?.getTime() ?? Date.now(),
        contentType: response.ContentType ?? contentTypeFromKey(key),
        originalName,
        uploadedAt,
        userId: Number.isFinite(userId) ? userId : null,
        backendId: this.id
      }
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: this.objectKey(key)
    }))
  }

  async createStream(
    key: string,
    range?: { start: number, end: number }
  ): Promise<Readable> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.objectKey(key),
      Range: range ? `bytes=${range.start}-${range.end}` : undefined
    }))

    if (!response.Body) {
      throw new Error('Empty S3 response body')
    }

    return response.Body as Readable
  }

  async testConnection(): Promise<{ ok: boolean, message: string }> {
    const probeKey = `__pichost-probe-${Date.now()}.txt`
    const probeBytes = new TextEncoder().encode('pichost-probe')

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: buildObjectKey(this.prefix, probeKey),
        Body: probeBytes,
        ContentType: 'text/plain'
      }))
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: buildObjectKey(this.prefix, probeKey)
      }))
      return { ok: true, message: '连接成功' }
    } catch (error) {
      const message = error instanceof Error ? error.message : '连接失败'
      return { ok: false, message }
    }
  }

  async getUsageStats(): Promise<{ count: number, bytes: number }> {
    return { count: 0, bytes: 0 }
  }
}
