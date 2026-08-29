import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'docs', 'screenshots')
const dest = join(root, 'docs-site', 'public', 'screenshots')

if (!existsSync(src)) {
  console.error(`Screenshot source missing: ${src}`)
  process.exit(1)
}

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`Copied screenshots to ${dest}`)
