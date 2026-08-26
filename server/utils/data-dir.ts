import { join } from 'node:path'

export function getDataDir(): string {
  return process.env.DATA_DIR || join(process.cwd(), 'data')
}
