import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SITE_KEY = 'site_base_url'
const IMAGE_KEY = 'image_base_url'

const args = process.argv.slice(2)
const siteOnly = args.includes('--site')
const imageOnly = args.includes('--image')

if (args.some(arg => arg.startsWith('--') && arg !== '--site' && arg !== '--image')) {
  console.error('Usage: clear-domains [--site] [--image]')
  console.error('  (no flags)  Clear both site and image URLs from settings')
  console.error('  --site      Clear site URL only')
  console.error('  --image     Clear image URL only')
  process.exit(1)
}

if (siteOnly && imageOnly) {
  console.error('Usage: specify at most one of --site or --image')
  process.exit(1)
}

const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(join(dataDir, 'pichost.db'))

function readSetting(key) {
  const row = db.prepare(`
    SELECT value
    FROM settings
    WHERE key = ?
  `).get(key)
  return row?.value ?? null
}

const beforeSite = readSetting(SITE_KEY)
const beforeImage = readSetting(IMAGE_KEY)

const keysToClear = siteOnly
  ? [SITE_KEY]
  : imageOnly
    ? [IMAGE_KEY]
    : [SITE_KEY, IMAGE_KEY]

for (const key of keysToClear) {
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}

db.close()

console.log('[PicHost] Domain settings cleared from database.')
if (keysToClear.includes(SITE_KEY)) {
  console.log(`  site_base_url: ${beforeSite ?? '(unset)'} → (removed)`)
}
if (keysToClear.includes(IMAGE_KEY)) {
  console.log(`  image_base_url: ${beforeImage ?? '(unset)'} → (removed)`)
}
console.log('[PicHost] Restart is not required. Refresh the admin page or use your previous access URL.')
