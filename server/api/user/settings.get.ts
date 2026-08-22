import { requireUserAuth } from '../../utils/access'
import { getUserAutoDeletePolicy } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const policy = getUserAutoDeletePolicy(user.id)

  return {
    autoDeleteDays: policy.days
  }
})
