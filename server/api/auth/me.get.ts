import { requireAdminAuth } from '../../utils/access'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  return { authenticated: true }
})
