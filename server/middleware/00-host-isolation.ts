import { shouldBlockImageHostRequest } from '../utils/host-isolation'

export default defineEventHandler((event) => {
  if (shouldBlockImageHostRequest(event)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
