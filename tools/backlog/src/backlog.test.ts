import { describe, expect, it } from 'vitest'

import { buildBacklogReport, type GitBranches } from './backlog.ts'
import type { Pbi } from './pbiFile.ts'

function pbi(overrides: Partial<Pbi> & Pick<Pbi, 'id'>): Pbi {
  return { path: `${overrides.id}.md`, status: 'todo', blockedBy: [], verification: [], followUps: [], ...overrides }
}

const noBranches: GitBranches = { unmergedIds: [], mergedIds: [] }

describe('buildBacklogReport status', () => {
  it('shows stored statuses, and in-progress for a PBI with an unmerged branch', () => {
    const report = buildBacklogReport(
      [pbi({ id: 'PBI-AR-001', status: 'done' }), pbi({ id: 'PBI-AR-002' }), pbi({ id: 'PBI-AR-003', status: 'dropped' })],
      { unmergedIds: ['PBI-AR-002'], mergedIds: [] },
    )

    expect(report.entries.map((entry) => [entry.id, entry.status])).toEqual([
      ['PBI-AR-001', 'done'],
      ['PBI-AR-002', 'in-progress'],
      ['PBI-AR-003', 'dropped'],
    ])
  })
})

describe('buildBacklogReport readiness', () => {
  it('lists todo PBIs whose blockers are all done and that have no unmerged branch', () => {
    const report = buildBacklogReport(
      [
        pbi({ id: 'PBI-AR-001', status: 'done' }),
        pbi({ id: 'PBI-AR-002', blockedBy: ['PBI-AR-001'] }),
        pbi({ id: 'PBI-AR-003', blockedBy: ['PBI-AR-001', 'PBI-AR-002'] }),
        pbi({ id: 'PBI-AR-004' }),
        pbi({ id: 'PBI-AR-005', blockedBy: ['PBI-AR-006'] }),
        pbi({ id: 'PBI-AR-006', status: 'dropped' }),
        pbi({ id: 'PBI-AR-007', status: 'done' }),
        pbi({ id: 'PBI-AR-008', blockedBy: ['PBI-AR-999'] }),
      ],
      { unmergedIds: ['PBI-AR-004'], mergedIds: [] },
    )

    expect(report.ready).toEqual(['PBI-AR-002'])
  })

  it('treats a todo PBI with no blockers as ready', () => {
    expect(buildBacklogReport([pbi({ id: 'PBI-AR-001' })], noBranches).ready).toEqual(['PBI-AR-001'])
  })
})

describe('buildBacklogReport follow-ups', () => {
  it('lists follow-ups not yet promoted to a PBI, with the PBI they came from', () => {
    const report = buildBacklogReport(
      [
        pbi({
          id: 'PBI-AR-001',
          status: 'done',
          followUps: [
            { text: 'Add paging -> PBI-AR-002', promotedTo: 'PBI-AR-002' },
            { text: 'Investigate flaky reconnect', promotedTo: null },
          ],
        }),
        pbi({ id: 'PBI-AR-002', followUps: [{ text: 'Cache the list', promotedTo: null }] }),
      ],
      noBranches,
    )

    expect(report.unpromotedFollowUps).toEqual([
      { id: 'PBI-AR-001', text: 'Investigate flaky reconnect' },
      { id: 'PBI-AR-002', text: 'Cache the list' },
    ])
  })
})

describe('buildBacklogReport git mismatch warnings', () => {
  it('warns about a merged branch whose PBI is not done', () => {
    const report = buildBacklogReport([pbi({ id: 'PBI-AR-001' })], { unmergedIds: [], mergedIds: ['PBI-AR-001'] })

    expect(report.warnings).toEqual(['PBI-AR-001: a branch is merged into master but status is todo'])
  })

  it('warns about an unmerged branch whose PBI is already done or dropped', () => {
    const report = buildBacklogReport(
      [pbi({ id: 'PBI-AR-001', status: 'done' }), pbi({ id: 'PBI-AR-002', status: 'dropped' })],
      { unmergedIds: ['PBI-AR-001', 'PBI-AR-002'], mergedIds: [] },
    )

    expect(report.warnings).toEqual([
      'PBI-AR-001: an unmerged branch exists but status is done',
      'PBI-AR-002: an unmerged branch exists but status is dropped',
    ])
  })

  it('warns about a branch naming an id that no PBI file has', () => {
    const report = buildBacklogReport([], { unmergedIds: ['PBI-AR-009'], mergedIds: ['PBI-AR-008'] })

    expect(report.warnings).toEqual([
      'PBI-AR-009: a branch names this id but no PBI file has it',
      'PBI-AR-008: a branch names this id but no PBI file has it',
    ])
  })

  it('does not warn when a merged branch matches a done PBI, or an earlier merged branch belongs to an in-progress PBI', () => {
    const report = buildBacklogReport(
      [pbi({ id: 'PBI-AR-001', status: 'done' }), pbi({ id: 'PBI-AR-002' })],
      { unmergedIds: ['PBI-AR-002'], mergedIds: ['PBI-AR-001', 'PBI-AR-002'] },
    )

    expect(report.warnings).toEqual([])
  })
})
