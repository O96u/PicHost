import { requireAdminAuth } from '../../utils/access'
import {
  fetchLatestGitHubRelease,
  isVersionNewer
} from '../../utils/app-version'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const config = useRuntimeConfig(event)
  const currentVersion = String(config.appVersion ?? '')
  const query = getQuery(event)
  const force = query.refresh === '1' || query.refresh === 'true'
  const latest = await fetchLatestGitHubRelease(force)

  if (!latest) {
    return {
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null
    }
  }

  return {
    currentVersion,
    latestVersion: latest.latestVersion,
    updateAvailable: isVersionNewer(latest.latestVersion, currentVersion),
    releaseUrl: latest.releaseUrl
  }
})
