/**
 * 将 data/ 下与 images 并列的顶层目录中的图片迁入 data/images/{原目录名}/...
 *
 * 用法：
 *   node server/cli/migrate-to-single-images.mjs          # dry-run
 *   node server/cli/migrate-to-single-images.mjs --apply  # 执行迁移
 *
 * Docker：
 *   docker exec pichost migrate
 *   docker exec pichost migrate --apply
 *
 * 输出 data/mapping.json（旧 key → 新 key）供替换外链。执行后重启 PicHost。
 */
import { promises as fs } from 'node:fs'
import { join, relative, dirname } from 'node:path'

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')
const IMAGES_DIR = join(DATA_DIR, 'images')

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i
const SKIP_TOP_LEVEL_DIRS = new Set(['images'])

const apply = process.argv.includes('--apply')

async function exists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function collectImageFiles(dir) {
  const files = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectImageFiles(full))
    } else if (
      entry.isFile()
      && IMAGE_EXT.test(entry.name)
      && !entry.name.endsWith('.meta.json')
    ) {
      files.push(full)
    }
  }
  return files
}

async function dirHasAnyFiles(dir) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return false
  }
  for (const entry of entries) {
    if (entry.isFile()) return true
    if (entry.isDirectory() && await dirHasAnyFiles(join(dir, entry.name))) {
      return true
    }
  }
  return false
}

async function main() {
  if (!await exists(DATA_DIR)) {
    console.error(`数据目录不存在: ${DATA_DIR}`)
    process.exit(1)
  }

  const topEntries = await fs.readdir(DATA_DIR, { withFileTypes: true })
  const sourceDirs = topEntries
    .filter(entry => entry.isDirectory() && !SKIP_TOP_LEVEL_DIRS.has(entry.name))
    .map(entry => ({ name: entry.name, path: join(DATA_DIR, entry.name) }))

  if (!sourceDirs.length) {
    console.log('未发现需迁移的顶层目录（data/ 下除 images 外无其它目录）')
    return
  }

  const mapping = {}
  const plan = []

  for (const { name, path } of sourceDirs) {
    const files = await collectImageFiles(path)
    for (const filePath of files) {
      const rel = relative(path, filePath).replace(/\\/g, '/')
      const newKey = `images/${name}/${rel}`
      const newDisk = join(IMAGES_DIR, name, rel)
      const oldKey = `${name}/${rel}`
      mapping[oldKey] = newKey
      plan.push({ from: filePath, to: newDisk, oldKey, newKey, sourceName: name })
    }
  }

  if (!plan.length) {
    console.log('未发现需迁移的图片（已扫描 data/ 下除 images 外的顶层目录）')
    return
  }

  const scanned = sourceDirs.map(dir => dir.name).join(', ')
  console.log(`已扫描顶层目录: ${scanned}`)
  console.log(`模式: ${apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`待迁移 ${plan.length} 个文件:`)
  for (const item of plan.slice(0, 20)) {
    console.log(`  ${item.oldKey} → ${item.newKey}`)
  }
  if (plan.length > 20) {
    console.log(`  … 另有 ${plan.length - 20} 个`)
  }

  const mappingPath = join(DATA_DIR, 'mapping.json')
  await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2))
  console.log(`已写入 ${mappingPath}`)

  if (!apply) {
    console.log('未执行文件移动。确认后运行:')
    console.log('  docker exec pichost migrate --apply')
    console.log('  或 npm run migrate -- --apply')
    return
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true })

  for (const item of plan) {
    await fs.mkdir(dirname(item.to), { recursive: true })
    try {
      await fs.rename(item.from, item.to)
    } catch (error) {
      if (error?.code === 'EXDEV') {
        await fs.copyFile(item.from, item.to)
        await fs.unlink(item.from)
      } else {
        throw error
      }
    }
    const metaFrom = item.from + '.meta.json'
    const metaTo = item.to + '.meta.json'
    try {
      await fs.rename(metaFrom, metaTo)
    } catch {
      // optional meta
    }
  }

  const sourceNames = [...new Set(plan.map(item => item.sourceName))]
  for (const name of sourceNames) {
    const path = join(DATA_DIR, name)
    if (await dirHasAnyFiles(path)) {
      console.log(`保留 ${name}/（仍有未迁移文件）`)
      continue
    }
    await fs.rm(path, { recursive: true, force: true })
    console.log(`已移除空目录 ${name}/`)
  }

  console.log('迁移完成。请重启 PicHost。')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
