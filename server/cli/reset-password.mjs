import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes, scryptSync } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const usernameArg = process.argv[2]?.trim() || ''

if (process.argv.length > 3) {
  console.error('Usage: reset-password [username]')
  process.exit(1)
}

const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(join(dataDir, 'pichost.db'))

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}

let user
if (usernameArg) {
  user = db.prepare(`
    SELECT id, username, role
    FROM users
    WHERE username = ?
  `).get(usernameArg)
  if (!user) fail(`user "${usernameArg}" not found`)
} else {
  const admins = db.prepare(`
    SELECT id, username, role
    FROM users
    WHERE role = 'admin'
    ORDER BY id ASC
  `).all()
  if (!admins.length) fail('no administrator account found')
  if (admins.length > 1) {
    const names = admins.map(row => row.username).join(', ')
    fail(`multiple administrators (${names}); run: reset-password <username>`)
  }
  user = admins[0]
}

const password = randomBytes(9).toString('base64url')
const salt = randomBytes(16).toString('hex')
const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
const passwordHash = `scrypt$16384$8$1$${salt}$${derived.toString('hex')}`

db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id)
db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
db.close()

console.log(`[PicHost] User "${user.username}" (${user.role}) password reset.`)
console.log(`[PicHost] New password: ${password}`)
console.log('[PicHost] Sign in and change it under Account.')
