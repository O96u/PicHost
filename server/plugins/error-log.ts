import { clientIp, logError, logException, logWarn, serializeError } from '../utils/logger'

/**
 * 记录未捕获的 H3/Nitro 错误（含 createApiError 抛出的 4xx/5xx）。
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    const serialized = serializeError(error)
    const status = typeof serialized.statusCode === 'number'
      ? serialized.statusCode
      : 500

    if (!event) {
      logError('unhandled error', serialized)
      return
    }

    const path = getRequestURL(event).pathname
    const method = getMethod(event)
    const base = {
      method,
      path,
      status,
      ip: clientIp(event),
      message: serialized.message,
      ...(serialized.statusMessage ? { reason: serialized.statusMessage } : {}),
      ...(serialized.data ? { data: serialized.data } : {})
    }

    if (!path.startsWith('/api/')) {
      if (status >= 500) {
        logException(`${method} ${path}`, error, base)
      }
      return
    }

    if (status >= 500) {
      logException('API error', error, base)
    } else if (status >= 400) {
      logWarn('API rejected', base)
    }
  })
})
