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
  getSettingsPayload,
  getSiteBaseUrl,
  getSiteBaseUrlConfigured,
  getSiteBaseUrlSource,
  getWebpQuality,
  getWebpQualitySource,
  isApiUploadTokenEnvConfigured,
  isAutoDeleteDaysEnvConfigured,
  isRefererEnvConfigured,
  isWebpQualityEnvConfigured,
  validateDomainSeparationPair,
  validateSettingsDomainPatch
} from './env'
import {
  getSetting,
  SETTINGS_ALLOWED_REFERER_HOSTS,
  SETTINGS_API_UPLOAD_TOKEN,
  SETTINGS_AUTO_DELETE_DAYS,
  SETTINGS_IMAGE_BASE_URL,
  SETTINGS_SITE_BASE_URL,
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
  apiUploadToken: '',
  siteBaseUrl: '',
  imageBaseUrl: ''
}))

vi.stubGlobal('getRequestURL', () => new URL('https://fallback.example.com'))

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

describe('getSiteBaseUrl priority', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.SITE_BASE_URL
  })

  it('prefers database over environment variable', () => {
    process.env.SITE_BASE_URL = 'https://env.example.com'
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_SITE_BASE_URL ? 'https://db.example.com' : null
    )
    const event = mockEvent()
    expect(getSiteBaseUrlConfigured(event)).toBe('https://db.example.com')
    expect(getSiteBaseUrlSource(event)).toBe('db')
    expect(getSiteBaseUrl(event)).toBe('https://db.example.com')
  })

  it('falls back to request origin when unset', () => {
    vi.mocked(getSetting).mockReturnValue(null)
    const event = mockEvent()
    expect(getSiteBaseUrl(event)).toBe('https://fallback.example.com')
    expect(getSiteBaseUrlSource(event)).toBe('none')
  })
})

describe('validateDomainSeparationPair', () => {
  it('rejects missing values', () => {
    expect(validateDomainSeparationPair('', 'https://pic.example.com')).toContain('同时填写')
  })

  it('rejects identical hostnames', () => {
    expect(validateDomainSeparationPair(
      'https://same.example.com',
      'https://same.example.com'
    )).toContain('相同主机名')
  })

  it('accepts different hostnames', () => {
    expect(validateDomainSeparationPair(
      'https://admin.example.com',
      'https://pic.example.com'
    )).toBeNull()
  })
})

describe('validateSettingsDomainPatch', () => {
  const dualExisting = {
    existingSite: 'https://admin.example.com',
    existingImage: 'https://pic.example.com'
  }

  it('requires both URLs when enabling domain separation', () => {
    expect(validateSettingsDomainPatch({
      ...dualExisting,
      nextSite: '',
      nextImage: 'https://pic.example.com',
      wantSeparation: true,
      siteBaseUrlProvided: true
    })).toContain('同时填写')
  })

  it('blocks clearing site without explicit disable when dual domain is active', () => {
    expect(validateSettingsDomainPatch({
      ...dualExisting,
      nextSite: '',
      nextImage: 'https://pic.example.com',
      wantSeparation: null,
      siteBaseUrlProvided: true
    })).toContain('不能单独清空管理域名')
  })

  it('allows clearing site when explicitly disabling domain separation', () => {
    expect(validateSettingsDomainPatch({
      ...dualExisting,
      nextSite: '',
      nextImage: 'https://pic.example.com',
      wantSeparation: false,
      siteBaseUrlProvided: true
    })).toBeNull()
  })
})

describe('getSettingsPayload configured vs effective', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.SITE_BASE_URL
    delete process.env.IMAGE_BASE_URL
  })

  it('returns configured site URL without request fallback', () => {
    vi.mocked(getSetting).mockImplementation((key) => {
      if (key === SETTINGS_SITE_BASE_URL) return 'https://admin.example.com'
      if (key === SETTINGS_IMAGE_BASE_URL) return 'https://pic.example.com'
      return null
    })
    vi.stubGlobal('getRequestURL', () => new URL('https://pages.dev'))

    const event = mockEvent()
    const payload = getSettingsPayload(event)

    expect(payload.siteBaseUrl).toBe('https://admin.example.com')
    expect(payload.effectiveSiteBaseUrl).toBe('https://admin.example.com')
    expect(payload.runtime.currentHost).toBe('pages.dev')
    expect(payload.runtime.hostRole).toBe('unknown')
  })
})
