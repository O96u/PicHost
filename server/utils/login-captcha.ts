const TOLERANCE_PERCENT = 4
const TTL_MS = 5 * 60 * 1000
const TRACK_WIDTH = 320
const TRACK_HEIGHT = 48
const TRACK_INSET = 4
const SLOT_SIZE = 40

interface CaptchaChallenge {
  targetPercent: number
  expiresAt: number
  confirmed: boolean
}

const challenges = new Map<string, CaptchaChallenge>()

function purgeExpired() {
  const now = Date.now()
  for (const [id, challenge] of challenges) {
    if (challenge.expiresAt <= now) {
      challenges.delete(id)
    }
  }
}

function isPositionMatch(targetPercent: number, positionPercent: number): boolean {
  return Math.abs(positionPercent - targetPercent) <= TOLERANCE_PERCENT
}

/** 缺口槽位 SVG（不返回 targetPercent 数字） */
export function buildCaptchaTrackSvg(targetPercent: number): string {
  const maxTravel = TRACK_WIDTH - SLOT_SIZE - TRACK_INSET * 2
  const slotX = (TRACK_INSET + (targetPercent / 100) * maxTravel).toFixed(1)
  const slotY = (TRACK_HEIGHT - SLOT_SIZE) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
  <rect x="${slotX}" y="${slotY}" width="${SLOT_SIZE}" height="${SLOT_SIZE}" rx="6" fill="#64748b" opacity="0.14"/>
</svg>`
}

export function createLoginCaptchaChallenge(): { id: string, svg: string } {
  purgeExpired()
  const id = crypto.randomUUID()
  const targetPercent = Math.floor(20 + Math.random() * 61)
  challenges.set(id, {
    targetPercent,
    expiresAt: Date.now() + TTL_MS,
    confirmed: false
  })
  return { id, svg: buildCaptchaTrackSvg(targetPercent) }
}

export function confirmLoginCaptcha(id: string, positionPercent: number): boolean {
  purgeExpired()
  const challenge = challenges.get(id)
  if (!challenge || challenge.expiresAt <= Date.now()) {
    if (challenge) challenges.delete(id)
    return false
  }
  if (!Number.isFinite(positionPercent)) return false
  if (!isPositionMatch(challenge.targetPercent, positionPercent)) {
    return false
  }
  challenge.confirmed = true
  return true
}

export function verifyLoginCaptcha(id: string, positionPercent: number): boolean {
  purgeExpired()
  const challenge = challenges.get(id)
  if (!challenge || challenge.expiresAt <= Date.now()) {
    if (challenge) challenges.delete(id)
    return false
  }
  if (!challenge.confirmed) return false
  challenges.delete(id)
  if (!Number.isFinite(positionPercent)) return false
  return isPositionMatch(challenge.targetPercent, positionPercent)
}

export function __resetLoginCaptchaStoreForTests() {
  challenges.clear()
}

export function __peekLoginCaptchaTargetForTests(id: string): number | undefined {
  return challenges.get(id)?.targetPercent
}
