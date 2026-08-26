import { describe, expect, it } from 'vitest'
import { serializeError } from './logger'

describe('serializeError', () => {
  it('extracts message and status from H3-like errors', () => {
    const error = new Error('bucket not found') as Error & {
      statusCode: number
      statusMessage: string
      data: { error: { code: string } }
    }
    error.statusCode = 404
    error.statusMessage = '存储桶不存在'
    error.data = { error: { code: 'NOT_FOUND' } }

    expect(serializeError(error)).toMatchObject({
      name: 'Error',
      message: 'bucket not found',
      statusCode: 404,
      statusMessage: '存储桶不存在',
      data: { error: { code: 'NOT_FOUND' } }
    })
  })

  it('includes stack for 5xx errors at info log level', () => {
    const error = new Error('db locked') as Error & { statusCode: number }
    error.statusCode = 500
    error.stack = 'Error: db locked\n    at test'

    const serialized = serializeError(error)
    expect(serialized.stack).toBe(error.stack)
  })
})
