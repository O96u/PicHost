import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import {
  generateApiUploadToken,
  setSetting,
  SETTINGS_API_UPLOAD_TOKEN
} from '../../../utils/db'
import { isApiUploadTokenEnvConfigured } from '../../../utils/env'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  if (isApiUploadTokenEnvConfigured(event)) {
    createApiError(
      event,
      'CONFLICT',
      'API_UPLOAD_TOKEN 已在环境变量中配置，无法在后台重新生成',
      409
    )
  }

  const token = generateApiUploadToken()
  setSetting(SETTINGS_API_UPLOAD_TOKEN, token)

  return {
    apiUploadToken: token,
    tokenSource: 'db' as const
  }
})
