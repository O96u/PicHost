const GITHUB_REPO = 'O96u/PicHost'
const RELEASES_LATEST_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
const CACHE_TTL_MS = 60 * 60 * 1000

export interface LatestReleaseInfo {
  latestVersion: string
  releaseUrl: string
}

let cachedRelease: { fetchedAt: number, value: LatestReleaseInfo | null } | null = null

export function normalizeVersionTag(tag: string): string {
  return tag.trim().replace(/^v/i, '')
}

export function parseVersionParts(version: string): number[] {
  return normalizeVersionTag(version)
    .split('.')
    .map(part => Number.parseInt(part, 10))
    .map(part => (Number.isFinite(part) ? part : 0))
}

export function isVersionNewer(candidate: string, current: string): boolean {
  const a = parseVersionParts(candidate)
  const b = parseVersionParts(current)
  const length = Math.max(a.length, b.length)

  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

export async function fetchLatestGitHubRelease(force = false): Promise<LatestReleaseInfo | null> {
  const now = Date.now()
  if (!force && cachedRelease && now - cachedRelease.fetchedAt < CACHE_TTL_MS) {
    return cachedRelease.value
  }

  try {
    const response = await fetch(RELEASES_LATEST_URL, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'PicHost'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      cachedRelease = { fetchedAt: now, value: null }
      return null
    }

    const data = await response.json() as {
      tag_name?: string
      html_url?: string
    }

    const tag = typeof data.tag_name === 'string' ? data.tag_name : ''
    const releaseUrl = typeof data.html_url === 'string' ? data.html_url : ''
    if (!tag) {
      cachedRelease = { fetchedAt: now, value: null }
      return null
    }

    const value: LatestReleaseInfo = {
      latestVersion: normalizeVersionTag(tag),
      releaseUrl: releaseUrl || `https://github.com/${GITHUB_REPO}/releases/latest`
    }
    cachedRelease = { fetchedAt: now, value }
    return value
  } catch {
    cachedRelease = { fetchedAt: now, value: null }
    return null
  }
}
