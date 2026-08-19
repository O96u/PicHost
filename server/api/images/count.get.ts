import { requireAdminAuth } from '../../utils/access'
import { getR2Bucket } from '../../utils/r2'
import { countImagesInBucket } from '../../utils/r2-images'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const bucket = getR2Bucket(event)
  const total = await countImagesInBucket(bucket)

  return { total }
})
