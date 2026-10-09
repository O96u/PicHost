import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll } from 'vitest'
import { closeDb } from '../utils/db'

const workerId = process.env.VITEST_POOL_ID ?? String(process.pid)
const dataDir = mkdtempSync(join(tmpdir(), `pichost-test-${workerId}-`))
process.env.DATA_DIR = dataDir

beforeAll(() => {
  closeDb()
})

afterAll(() => {
  closeDb()
  try {
    rmSync(dataDir, { recursive: true, force: true })
  } catch {
    // Windows may still hold the sqlite file for a moment after close
  }
})
