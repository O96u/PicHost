import { requireAdminAuth } from '../../utils/access'
import { getSettingsPayload } from '../../utils/env'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  return getSettingsPayload(event)
})
