import { runAutoDeleteCleanup } from '../utils/auto-delete'

export default defineTask({
  meta: {
    name: 'auto-delete',
    description: 'Delete images older than auto_delete_days'
  },
  async run() {
    return { result: await runAutoDeleteCleanup() }
  }
})
