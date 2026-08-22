export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  return {
    status: 'ok',
    version: config.appVersion
  }
})
