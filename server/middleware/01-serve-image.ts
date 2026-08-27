import { requestPathToImageKey, serveImageByKey } from '../utils/serve-image'

/**
 * 仅当路径像图片 key（{type}/YYYY/MM/file.ext）时才接管。
 * 其它请求（/_nuxt、/api、页面）原样放行。
 */
export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  if (method !== 'GET' && method !== 'HEAD') return

  const key = requestPathToImageKey(getRequestURL(event).pathname, {
    hideFolder: isHideFolderInUrl(event)
  })
  if (!key) return

  return serveImageByKey(event, key)
})
