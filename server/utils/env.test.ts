import { describe, expect, it, vi, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import {
  getApiUploadToken,
  getApiUploadTokenFromEnv,
  getApiUploadTokenSource,
  getAllowedRefererHostsRaw,
  getAutoDeleteDays,
  getAutoDeleteDaysSource,
  getRefererSource,
  getWebpQuality,
  getWebpQualitySource,
  isApiUploadTokenEnvConfigured,
  isAutoDeleteDaysEnvConfigured,
  isRefererEnvConfigured,
  isWebpQualityEnvConfigured
} from './env'
import {
  getSetting,
  SETTINGS_ALLOWED_REFERER_HOSTS,
  SETTINGS_API_UPLOAD_TOKEN,
  SETTINGS_AUTO_DELETE_DAYS,
  SETTINGS_WEBP_QUALITY,
  generateApiUploadToken
} from './db'

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db')>()
  return {
    ...actual,
    getSetting: vi.fn(),
    setSetting: vi.fn()
  }
})

vi.stubGlobal('useRuntimeConfig', () => ({
  apiUploadToken: ''
}))

function mockEvent(): H3Event {
  return {
    node: { req: {}, res: {} },
    context: {}
  } as H3Event
}

describe('getApiUploadToken priority', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.API_UPLOAD_TOKEN
    delete process.env.NUXT_API_UPLOAD_TOKEN
  })

  it('prefers environment variable over database', () => {
    process.env.API_UPLOAD_TOKEN = 'env-token'
    vi.mocked(getSetting).mockReturnValue('db-token')

    const event = mockEvent()
    expect(getApiUploadToken(event)).toBe('env-token')
    expect(getApiUploadTokenSource(event)).toBe('env')
    expect(isApiUploadTokenEnvConfigured(event)).toBe(true)
  })

  it('falls back to database when env is unset', () => {
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_API_UPLOAD_TOKEN ? 'db-token' : null
    )

    const event = mockEvent()
    expect(getApiUploadToken(event)).toBe('db-token')
    expect(getApiUploadTokenSource(event)).toBe('db')
    expect(isApiUploadTokenEnvConfigured(event)).toBe(false)
  })

  it('returns empty when neither env nor db is configured', () => {
    vi.mocked(getSetting).mockReturnValue(null)

    const event = mockEvent()
    expect(getApiUploadToken(event)).toBe('')
    expect(getApiUploadTokenSource(event)).toBe('none')
  })
})

describe('generateApiUploadToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateApiUploadToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique tokens', () => {
    const a = generateApiUploadToken()
    const b = generateApiUploadToken()
    expect(a).not.toBe(b)
  })
})

describe('settings storage helpers', () => {
  it('getApiUploadTokenFromEnv reads API_UPLOAD_TOKEN', () => {
    process.env.API_UPLOAD_TOKEN = 'from-env'
    const event = mockEvent()
    expect(getApiUploadTokenFromEnv(event)).toBe('from-env')
    delete process.env.API_UPLOAD_TOKEN
  })
})

describe('getWebpQuality priority', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.WEBP_QUALITY
  })

  it('prefers database over environment variable', () => {
    process.env.WEBP_QUALITY = '95'
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_WEBP_QUALITY ? '72' : null
    )
    expect(getWebpQuality()).toBe(72)
    expect(getWebpQualitySource()).toBe('db')
  })

  it('falls back to environment variable when db is unset', () => {
    process.env.WEBP_QUALITY = '95'
    vi.mocked(getSetting).mockReturnValue(null)
    expect(getWebpQuality()).toBe(95)
    expect(getWebpQualitySource()).toBe('env')
    expect(isWebpQualityEnvConfigured()).toBe(true)
  })

  it('uses default 80 when neither env nor db is configured', () => {
    vi.mocked(getSetting).mockReturnValue(null)
    expect(getWebpQuality()).toBe(80)
    expect(getWebpQualitySource()).toBe('default')
  })
})

describe('getAllowedRefererHostsRaw priority', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.ALLOWED_REFERER_HOSTS
  })

  it('prefers database over environment variable', () => {
    process.env.ALLOWED_REFERER_HOSTS = 'blog.example.com'
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_ALLOWED_REFERER_HOSTS ? 'wiki.example.com' : null
    )
    expect(getAllowedRefererHostsRaw()).toBe('wiki.example.com')
    expect(getRefererSource()).toBe('db')
  })

  it('falls back to environment variable when db is unset', () => {
    process.env.ALLOWED_REFERER_HOSTS = 'blog.example.com'
    vi.mocked(getSetting).mockReturnValue(null)
    expect(getAllowedRefererHostsRaw()).toBe('blog.example.com')
    expect(getRefererSource()).toBe('env')
    expect(isRefererEnvConfigured()).toBe(true)
  })

  it('returns empty when neither env nor db is configured', () => {
    vi.mocked(getSetting).mockReturnValue(null)
    expect(getAllowedRefererHostsRaw()).toBe('')
    expect(getRefererSource()).toBe('none')
  })

  it('allows database empty string to override env', () => {
    process.env.ALLOWED_REFERER_HOSTS = 'blog.example.com'
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_ALLOWED_REFERER_HOSTS ? '' : null
    )
    expect(getAllowedRefererHostsRaw()).toBe('')
    expect(getRefererSource()).toBe('db')
  })
})

describe('getAutoDeleteDays priority', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.AUTO_DELETE_DAYS
  })

  it('prefers database over environment variable', () => {
    process.env.AUTO_DELETE_DAYS = '90'
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_AUTO_DELETE_DAYS ? '30' : null
    )
    expect(getAutoDeleteDays()).toBe(30)
    expect(getAutoDeleteDaysSource()).toBe('db')
  })

  it('falls back to environment variable when db is unset', () => {
    process.env.AUTO_DELETE_DAYS = '45'
    vi.mocked(getSetting).mockReturnValue(null)
    expect(getAutoDeleteDays()).toBe(45)
    expect(getAutoDeleteDaysSource()).toBe('env')
    expect(isAutoDeleteDaysEnvConfigured()).toBe(true)
  })

  it('returns 0 when neither env nor db is configured', () => {
    vi.mocked(getSetting).mockReturnValue(null)
    expect(getAutoDeleteDays()).toBe(0)
    expect(getAutoDeleteDaysSource()).toBe('default')
  })
})
