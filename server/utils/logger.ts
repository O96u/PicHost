type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
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

export function clientIp(event: Parameters<typeof getRequestIP>[0]): string {
  return getRequestIP(event, { xForwardedFor: true }) || '-'
}
