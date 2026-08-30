import {
  shouldBlockImageHostRequest,
  shouldBlockSiteHostImageRequest,
  shouldBlockUnknownHostRequest
} from '../utils/host-isolation'

const HOST_ISOLATION_CACHE_CONTROL = 'private, no-cache, max-age=0'

export default defineEventHandler((event) => {
  if (
    shouldBlockUnknownHostRequest(event)
    || shouldBlockImageHostRequest(event)
    || shouldBlockSiteHostImageRequest(event)
  ) {
    setHeader(event, 'Cache-Control', HOST_ISOLATION_CACHE_CONTROL)
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
