import type { AllowedMimeType } from './constants'

function matchJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3
    && bytes[0] === 0xFF
    && bytes[1] === 0xD8
    && bytes[2] === 0xFF
}

function matchPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

function matchGif(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false
  const header = new TextDecoder().decode(bytes.subarray(0, 6))
  return header === 'GIF87a' || header === 'GIF89a'
}

function matchWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  const riff = new TextDecoder().decode(bytes.subarray(0, 4))
  const webp = new TextDecoder().decode(bytes.subarray(8, 12))
  return riff === 'RIFF' && webp === 'WEBP'
}

/** ICO 文件头：00 00 01 00 */
function matchIco(bytes: Uint8Array): boolean {
  return bytes.length >= 6
    && bytes[0] === 0x00
    && bytes[1] === 0x00
    && bytes[2] === 0x01
    && bytes[3] === 0x00
}

/** SVG 是 XML 文本，无二进制签名，按内容开头识别 */
function matchSvg(bytes: Uint8Array): boolean {
  if (!bytes.length) return false
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, 1024))
  const trimmed = head.replace(/^\uFEFF/, '').trimStart()
  if (
    !trimmed.startsWith('<?xml')
    && !trimmed.startsWith('<svg')
    && !trimmed.startsWith('<!--')
  ) {
    return false
  }
  return /<svg[\s>]/i.test(head)
}

const SIGNATURE_CHECKS: Record<AllowedMimeType, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': matchJpeg,
  'image/png': matchPng,
  'image/gif': matchGif,
  'image/webp': matchWebp,
  'image/x-icon': matchIco,
  'image/svg+xml': matchSvg
}

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return mime in SIGNATURE_CHECKS
}

export function validateFileSignature(
  mime: AllowedMimeType,
  bytes: Uint8Array
): boolean {
  const checker = SIGNATURE_CHECKS[mime]
  return checker(bytes)
}

export function detectMimeFromSignature(bytes: Uint8Array): AllowedMimeType | null {
  for (const mime of Object.keys(SIGNATURE_CHECKS) as AllowedMimeType[]) {
    if (SIGNATURE_CHECKS[mime](bytes)) {
      return mime
    }
  }
  return null
}
