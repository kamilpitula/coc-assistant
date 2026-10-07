import { describe, expect, it } from 'vitest'

import { parseBranchRefs } from './branches.ts'

describe('parseBranchRefs', () => {
  it('maps local and remote branches named <type>/<area>-<nnn>-<slug> to PBI ids, once each', () => {
    const output = [
      'refs/heads/feature/cp-013-campaign-list',
      'refs/remotes/origin/feature/cp-013-campaign-list',
      'refs/remotes/origin/fix/E2E-002-flaky-login',
      'refs/heads/chore/wf-001',
      '',
    ].join('\n')

    expect(parseBranchRefs(output)).toEqual(['PBI-CP-013', 'PBI-E2E-002', 'PBI-WF-001'])
  })

  it('ignores branches without a PBI id, master and the remote HEAD', () => {
    const output = [
      'refs/heads/master',
      'refs/remotes/origin/HEAD',
      'refs/heads/e2e/authenticated-harness',
      'refs/remotes/origin/ci/github-actions',
      'refs/heads/fix/auth-header-and-display-name',
      'refs/heads/feature/cp-13-too-short',
      'refs/heads/cp-013-no-type',
    ].join('\r\n')

    expect(parseBranchRefs(output)).toEqual([])
  })
})
