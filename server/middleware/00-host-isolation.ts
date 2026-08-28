import { shouldBlockImageHostRequest, shouldBlockSiteHostImageRequest } from '../utils/host-isolation'

export default defineEventHandler((event) => {
  if (shouldBlockImageHostRequest(event) || shouldBlockSiteHostImageRequest(event)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
