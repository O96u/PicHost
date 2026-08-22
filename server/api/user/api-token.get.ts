import { requireUserAuth } from '../../utils/access'
import { ensureUserApiToken } from '../../utils/db'
import { getImageBaseUrl } from '../../utils/env'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const config = useRuntimeConfig(event)

  return {
    apiUploadToken: ensureUserApiToken(user.id),
    tokenSource: 'db' as const,
    envTokenOverride: false,
    env: {
      webpQuality: 80,
      refererConfigured: false,
      imageBaseUrl: getImageBaseUrl(event),
      appVersion: config.appVersion as string
    }
  }
})
