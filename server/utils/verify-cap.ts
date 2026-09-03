interface CapVerifyResult {
  success?: boolean
}

export async function verifyCapToken(
  endpoint: string,
  secret: string,
  token: string
): Promise<boolean> {
  if (!endpoint || !secret || !token) return false

  const base = endpoint.endsWith('/') ? endpoint : `${endpoint}/`
  const url = `${base}siteverify`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
      signal: controller.signal
    })
    const result = await response.json() as CapVerifyResult
    return result.success === true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}
