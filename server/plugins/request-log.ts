import { clientIp, logError, logInfo, logWarn } from '../utils/logger'

/**
 * 只记录 /api/*，避免 /images、/twikoo 直链刷屏。
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context._reqStartedAt = Date.now()
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    const path = getRequestURL(event).pathname
    if (!path.startsWith('/api/')) return

    // 高频探测接口降噪
    if (path === '/api/auth/me' || path === '/api/auth/config') return

    const method = getMethod(event)
    const status = getResponseStatus(event)
    const started = event.context._reqStartedAt as number | undefined
    const ms = started ? Date.now() - started : undefined
    const reason = status >= 400 ? getResponseStatusText(event) : undefined

    const detail: Record<string, unknown> = {
      status,
      ms,
      ip: clientIp(event)
    }
    if (reason && reason !== String(status)) {
      detail.reason = reason
    }

    const line = `${method} ${path}`
    if (status >= 500) {
      logError(line, detail)
    } else if (status >= 400) {
      logWarn(line, detail)
    } else {
      logInfo(line, detail)
    }
  })
})
