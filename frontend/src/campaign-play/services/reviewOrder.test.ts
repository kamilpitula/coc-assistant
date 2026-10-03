import { describe, expect, it } from 'vitest'

import type { InvestigatorListItem } from '@/campaign-play/types/Investigator'

import { inReviewOrder } from './reviewOrder'

function row(playerName: string, status: InvestigatorListItem['status'], updatedAt: string): InvestigatorListItem {
  return { playerAccountId: playerName, playerName, status, investigatorId: null, investigatorName: null, updatedAt }
}

/** specs/character-sheet/ux.md section 3.1: Submitted, Changes Requested, Approved, In progress; oldest first. */
describe('inReviewOrder', () => {
  it('puts Submitted first, then Changes Requested, Approved, and In progress, each oldest update first', () => {
    const rows = [
      row('Draft', 'Draft', '2026-10-01T10:00:00Z'),
      row('Approved', 'Approved', '2026-10-01T10:00:00Z'),
      row('Newer submitted', 'Submitted', '2026-10-02T10:00:00Z'),
      row('Changes', 'ChangesRequested', '2026-10-01T10:00:00Z'),
      row('Older submitted', 'Submitted', '2026-10-01T09:00:00Z'),
    ]

    expect(inReviewOrder(rows).map((item) => item.playerName)).toEqual([
      'Older submitted',
      'Newer submitted',
      'Changes',
      'Approved',
      'Draft',
    ])
  })
})
