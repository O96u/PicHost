import { requireUserAuth } from '../../../utils/access'
import { generateApiUploadToken, setUserApiToken } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const token = generateApiUploadToken()
  setUserApiToken(user.id, token)

  return { apiUploadToken: token }
})
