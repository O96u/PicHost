import { describe, expect, it } from 'vitest'
import {
  issueBackupJobWatchToken,
  revokeBackupJobWatchToken,
  validateBackupJobWatchToken
} from './watch-token'

describe('backup job watch token', () => {
  it('accepts a token issued for the job', () => {
    const jobId = 'job-test-1'
    const token = issueBackupJobWatchToken(jobId)
    expect(validateBackupJobWatchToken(jobId, token)).toBe(true)
    expect(validateBackupJobWatchToken(jobId, 'wrong')).toBe(false)
    revokeBackupJobWatchToken(jobId)
    expect(validateBackupJobWatchToken(jobId, token)).toBe(false)
  })
})
