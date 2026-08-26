type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

type H3LikeError = Error & {
  statusCode?: number
  statusMessage?: string
  data?: unknown
}

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw
  }
  return 'info'
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()]
}

function formatLine(level: LogLevel, message: string, extra?: Record<string, unknown>): string {
  const time = new Date().toISOString()
  const payload = extra && Object.keys(extra).length
    ? ` ${JSON.stringify(extra)}`
    : ''
  return `[${time}] [${level.toUpperCase()}] ${message}${payload}`
}

/** 将 unknown / Error / H3Error 转为可 JSON 输出的字段，便于 Docker 日志排查 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const h3 = error as H3LikeError
    const out: Record<string, unknown> = {
      name: error.name,
      message: error.message
    }
    if (h3.statusCode !== undefined) out.statusCode = h3.statusCode
    if (h3.statusMessage) out.statusMessage = h3.statusMessage
    if (h3.data !== undefined) out.data = h3.data
    if (error.stack && shouldLog('debug')) out.stack = error.stack
    else if (error.stack && (h3.statusCode ?? 500) >= 500) out.stack = error.stack
    if ('cause' in error && error.cause !== undefined) {
      out.cause = serializeError(error.cause)
    }
    return out
  }
  if (typeof error === 'string') return { message: error }
  if (error && typeof error === 'object') {
    try {
      return { detail: JSON.parse(JSON.stringify(error)) }
    } catch {
      return { message: String(error) }
    }
  }
  return { message: String(error) }
}

export function logDebug(message: string, extra?: Record<string, unknown>) {
  if (!shouldLog('debug')) return
  console.debug(formatLine('debug', message, extra))
}

export function logInfo(message: string, extra?: Record<string, unknown>) {
  if (!shouldLog('info')) return
  console.log(formatLine('info', message, extra))
}

export function logWarn(message: string, extra?: Record<string, unknown>) {
  if (!shouldLog('warn')) return
  console.warn(formatLine('warn', message, extra))
}

export function logError(message: string, extra?: Record<string, unknown>) {
  if (!shouldLog('error')) return
  console.error(formatLine('error', message, extra))
}

/** message + 原始 error 对象（自动 serialize） */
export function logException(message: string, error: unknown, extra?: Record<string, unknown>) {
  logError(message, { ...extra, error: serializeError(error) })
}

export function clientIp(event: Parameters<typeof getRequestIP>[0]): string {
  return getRequestIP(event, { xForwardedFor: true }) || '-'
}
