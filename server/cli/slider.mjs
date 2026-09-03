import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SETTING_KEY = 'login_verification_method'
const SLIDER = 'slider'

if (process.argv.length > 2) {
  console.error('Usage: slider')
  process.exit(1)
}

const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(join(dataDir, 'pichost.db'))

const row = db.prepare(`
  SELECT value
  FROM settings
  WHERE key = ?
`).get(SETTING_KEY)

const previous = row?.value ?? null
const updatedAt = new Date().toISOString()

db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at
`).run(SETTING_KEY, SLIDER, updatedAt)

db.close()

if (previous === SLIDER) {
  console.log('[PicHost] Login verification is already set to slider.')
} else {
  console.log(`[PicHost] Login verification changed: ${previous ?? '(unset)'} → slider`)
}
console.log('[PicHost] Refresh the login page to use the local slider captcha.')
